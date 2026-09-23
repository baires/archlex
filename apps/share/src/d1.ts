import { isShareId } from "./security.js";

export interface ShareRecord {
  id: string;
  source: string;
  createdAt: number;
  expiresAt: number;
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
}

const INSERT_SQL =
  "INSERT INTO shares (id, source, created_at, expires_at) VALUES (?, ?, ?, ?)";
const SAVE_BY_SOURCE_SQL =
  "INSERT INTO shares (id, source, created_at, expires_at, source_hash) VALUES (?, ?, ?, ?, ?) ON CONFLICT(source_hash) DO UPDATE SET expires_at = excluded.expires_at RETURNING id";
const SELECT_SQL =
  "SELECT id, source, created_at, expires_at FROM shares WHERE id = ? AND expires_at > ?";
const DELETE_EXPIRED_SQL = "DELETE FROM shares WHERE expires_at <= ?";
const DELETE_OLD_POST_LIMITS_SQL =
  "DELETE FROM post_limits WHERE window_start < ?";
const UPSERT_LIMIT_SQL =
  "INSERT INTO post_limits (ip, window_start, count) VALUES (?, ?, 1) ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1 RETURNING count";
const UPSERT_DAILY_BUDGET_SQL =
  "INSERT INTO post_limits (ip, window_start, count, bytes_used) VALUES (?, ?, 1, ?) ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1, bytes_used = bytes_used + excluded.bytes_used WHERE count < ? AND bytes_used + excluded.bytes_used <= ? RETURNING count";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const GLOBAL_DAILY_KEY = "__global_daily__";
export const POSTS_PER_HOUR = 30;
export const POSTS_PER_DAY = 1_000;
export const SOURCE_BYTES_PER_DAY = 10 * 1024 * 1024;

export async function insertShare(
  db: ShareD1,
  record: ShareRecord,
): Promise<void> {
  if (!isShareId(record.id)) {
    throw new Error("invalid share id");
  }
  await db
    .prepare(INSERT_SQL)
    .bind(record.id, record.source, record.createdAt, record.expiresAt)
    .run();
}

export async function saveShareBySource(
  db: ShareD1,
  record: ShareRecord,
  sourceHash: string,
): Promise<string> {
  if (!isShareId(record.id)) {
    throw new Error("invalid share id");
  }
  const row = await db
    .prepare(SAVE_BY_SOURCE_SQL)
    .bind(
      record.id,
      record.source,
      record.createdAt,
      record.expiresAt,
      sourceHash,
    )
    .first<{ id: string }>();
  if (!row || !isShareId(row.id)) {
    throw new Error("could not save share");
  }
  return row.id;
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
  now: number,
  sourceBytes: number,
): Promise<boolean> {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 0 ||
    sourceBytes > SOURCE_BYTES_PER_DAY
  ) {
    return false;
  }
  const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
  const row = await db
    .prepare(UPSERT_DAILY_BUDGET_SQL)
    .bind(
      GLOBAL_DAILY_KEY,
      dayStart,
      sourceBytes,
      POSTS_PER_DAY,
      SOURCE_BYTES_PER_DAY,
    )
    .first<{ count: number }>();
  return row !== null;
}

export async function deleteExpiredShares(
  db: ShareD1,
  now: number,
): Promise<void> {
  await db.prepare(DELETE_EXPIRED_SQL).bind(now).run();
}

export async function deleteExpiredPostLimits(
  db: ShareD1,
  now: number,
): Promise<void> {
  const currentDayStart = Math.floor(now / DAY_MS) * DAY_MS;
  await db.prepare(DELETE_OLD_POST_LIMITS_SQL).bind(currentDayStart).run();
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
  };
}
