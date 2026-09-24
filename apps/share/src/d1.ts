import { isShareId } from "./security.js";

export interface ShareRecord {
  id: string;
  source: string;
  createdAt: number;
  expiresAt: number;
  sourceHash?: string | null;
  revokeHash?: string | null;
}

export interface BoundStatement {
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
}

export interface ShareD1 {
  prepare(query: string): {
    bind(...values: unknown[]): BoundStatement;
  };
}

interface ShareRow {
  id: string;
  source: string;
  created_at: number;
  expires_at: number;
  source_hash?: string | null;
  revoke_hash?: string | null;
}

const INSERT_SQL =
  "INSERT INTO shares (id, source, created_at, expires_at, source_hash, revoke_hash) VALUES (?, ?, ?, ?, ?, ?)";
const SELECT_SQL =
  "SELECT id, source, created_at, expires_at, source_hash, revoke_hash FROM shares WHERE id = ? AND expires_at > ?";
const DELETE_SHARE_SQL = "DELETE FROM shares WHERE id = ?";
const DELETE_EXPIRED_SQL = "DELETE FROM shares WHERE expires_at <= ? LIMIT 500";
const DELETE_OLD_POST_LIMITS_SQL =
  "DELETE FROM post_limits WHERE window_start < ? LIMIT 500";
const UPSERT_LIMIT_SQL =
  "INSERT INTO post_limits (ip, window_start, count) VALUES (?, ?, 1) ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1 RETURNING count";
const UPSERT_DAILY_BUDGET_SQL =
  "INSERT INTO post_limits (ip, window_start, count, bytes_used) VALUES (?, ?, 1, ?) ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1, bytes_used = bytes_used + excluded.bytes_used WHERE count < ? AND bytes_used + excluded.bytes_used <= ? RETURNING count";
const REFUND_DAILY_BYTES_SQL =
  "UPDATE post_limits SET bytes_used = MAX(0, bytes_used - ?) WHERE ip = ? AND window_start = ?";
const ROLLBACK_DAILY_BUDGET_SQL =
  "UPDATE post_limits SET count = MAX(0, count - 1), bytes_used = MAX(0, bytes_used - ?) WHERE ip = ? AND window_start = ?";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const IP_DAILY_KEY_PREFIX = "__ip_daily__:";
const GLOBAL_DAILY_KEY = "__global_daily__";
export const POSTS_PER_HOUR = 30;
export const POSTS_PER_IP_PER_DAY = 200;
export const BYTES_PER_IP_PER_DAY = 2 * 1024 * 1024;
export const POSTS_PER_DAY = 20_000;
export const SOURCE_BYTES_PER_DAY = 200 * 1024 * 1024;
const DELETE_BATCH_SIZE = 500;
const MAX_DELETE_BATCHES = 20;

export async function insertShare(
  db: ShareD1,
  record: ShareRecord,
): Promise<void> {
  if (!isShareId(record.id)) {
    throw new Error("invalid share id");
  }
  await db
    .prepare(INSERT_SQL)
    .bind(
      record.id,
      record.source,
      record.createdAt,
      record.expiresAt,
      record.sourceHash ?? null,
      record.revokeHash ?? null,
    )
    .run();
}

export async function deleteShare(db: ShareD1, id: string): Promise<boolean> {
  if (!isShareId(id)) return false;
  const result = await db.prepare(DELETE_SHARE_SQL).bind(id).run();
  const changes = getChanges(result);
  return changes !== null ? changes > 0 : true;
}

export async function consumePostLimit(
  db: ShareD1,
  ip: string,
  now: number,
): Promise<boolean> {
  const windowStart = Math.floor(now / HOUR_MS) * HOUR_MS;
  const row = await db
    .prepare(UPSERT_LIMIT_SQL)
    .bind(ip, windowStart)
    .first<{ count: number }>();
  return (row?.count ?? POSTS_PER_HOUR + 1) <= POSTS_PER_HOUR;
}

export async function consumeDailyPostBudget(
  db: ShareD1,
  ip: string,
  now: number,
  sourceBytes: number,
): Promise<boolean> {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 0 ||
    sourceBytes > BYTES_PER_IP_PER_DAY
  ) {
    return false;
  }
  const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
  const ipRow = await db
    .prepare(UPSERT_DAILY_BUDGET_SQL)
    .bind(
      `${IP_DAILY_KEY_PREFIX}${ip}`,
      dayStart,
      sourceBytes,
      POSTS_PER_IP_PER_DAY,
      BYTES_PER_IP_PER_DAY,
    )
    .first<{ count: number }>();
  if (!ipRow) return false;

  let globalRow: { count: number } | null;
  try {
    globalRow = await db
      .prepare(UPSERT_DAILY_BUDGET_SQL)
      .bind(
        GLOBAL_DAILY_KEY,
        dayStart,
        sourceBytes,
        POSTS_PER_DAY,
        SOURCE_BYTES_PER_DAY,
      )
      .first<{ count: number }>();
  } catch (error) {
    await rollbackDailyBudget(
      db,
      `${IP_DAILY_KEY_PREFIX}${ip}`,
      dayStart,
      sourceBytes,
    );
    throw error;
  }
  if (!globalRow) {
    await rollbackDailyBudget(
      db,
      `${IP_DAILY_KEY_PREFIX}${ip}`,
      dayStart,
      sourceBytes,
    );
    return false;
  }
  return true;
}

export async function refundDailySourceBytes(
  db: ShareD1,
  ip: string,
  now: number,
  sourceBytes: number,
): Promise<void> {
  if (!Number.isSafeInteger(sourceBytes) || sourceBytes <= 0) return;
  const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
  await refundBytes(db, `${IP_DAILY_KEY_PREFIX}${ip}`, dayStart, sourceBytes);
  await refundBytes(db, GLOBAL_DAILY_KEY, dayStart, sourceBytes);
}

async function refundBytes(
  db: ShareD1,
  key: string,
  dayStart: number,
  sourceBytes: number,
): Promise<void> {
  await db
    .prepare(REFUND_DAILY_BYTES_SQL)
    .bind(sourceBytes, key, dayStart)
    .run();
}

async function rollbackDailyBudget(
  db: ShareD1,
  key: string,
  dayStart: number,
  sourceBytes: number,
): Promise<void> {
  await db
    .prepare(ROLLBACK_DAILY_BUDGET_SQL)
    .bind(sourceBytes, key, dayStart)
    .run();
}

export async function deleteExpiredShares(
  db: ShareD1,
  now: number,
): Promise<void> {
  await deleteInBatches(db, DELETE_EXPIRED_SQL, now);
}

export async function deleteExpiredPostLimits(
  db: ShareD1,
  now: number,
): Promise<void> {
  const currentDayStart = Math.floor(now / DAY_MS) * DAY_MS;
  await deleteInBatches(db, DELETE_OLD_POST_LIMITS_SQL, currentDayStart);
}

async function deleteInBatches(
  db: ShareD1,
  sql: string,
  cutoff: number,
): Promise<void> {
  for (let batch = 0; batch < MAX_DELETE_BATCHES; batch += 1) {
    const result = await db.prepare(sql).bind(cutoff).run();
    const changes = getChanges(result);
    if (changes === null || changes < DELETE_BATCH_SIZE) return;
  }
}

function getChanges(result: unknown): number | null {
  if (result === null || typeof result !== "object" || !("meta" in result)) {
    return null;
  }
  const meta = result.meta;
  if (meta === null || typeof meta !== "object" || !("changes" in meta)) {
    return null;
  }
  const changes = meta.changes;
  return typeof changes === "number" ? changes : null;
}

export async function findActiveShare(
  db: ShareD1,
  id: string,
  now: number,
): Promise<ShareRecord | null> {
  if (!isShareId(id)) return null;
  const row = await db.prepare(SELECT_SQL).bind(id, now).first<ShareRow>();
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    ...(row.source_hash ? { sourceHash: row.source_hash } : {}),
    ...(row.revoke_hash ? { revokeHash: row.revoke_hash } : {}),
  };
}
