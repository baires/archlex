import type { ShareD1 } from "../src/d1.js";
import type { RateLimitBinding } from "../src/env.js";

export interface RecordedQuery {
  sql: string;
  values: unknown[];
}

interface ShareRow {
  id: string;
  source: string;
  created_at: number;
  expires_at: number;
  source_hash?: string;
  revoke_hash?: string;
}

export interface LimitRow {
  count: number;
  bytesUsed: number;
  windowStart: number;
}

export interface FakeD1 extends ShareD1 {
  queries: RecordedQuery[];
  rows: Map<string, ShareRow>;
  limits: Map<string, LimitRow>;
}

export function createAllowingRateLimit(): RateLimitBinding {
  return {
    async limit() {
      return { success: true };
    },
  };
}

export function createFakeD1(
  afterSourceLookup?: (exists: boolean) => Promise<void>,
): FakeD1 {
  const queries: RecordedQuery[] = [];
  const rows = new Map<string, ShareRow>();
  const limits = new Map<string, LimitRow>();

  return {
    queries,
    rows,
    limits,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              queries.push({ sql, values });
              if (sql === "DELETE FROM shares WHERE id = ?") {
                const deleted = rows.delete(String(values[0]));
                return { success: true, meta: { changes: Number(deleted) } };
              }
              if (sql.startsWith("UPDATE post_limits SET bytes_used = MAX")) {
                const [bytes, key, windowStart] = values;
                const current = limits.get(`${key}:${windowStart}`);
                if (current) {
                  current.bytesUsed = Math.max(
                    0,
                    current.bytesUsed - Number(bytes),
                  );
                }
                return { success: true };
              }
              if (sql.startsWith("UPDATE post_limits SET count = MAX")) {
                const [bytes, key, windowStart] = values;
                const current = limits.get(`${key}:${windowStart}`);
                if (current) {
                  current.count = Math.max(0, current.count - 1);
                  current.bytesUsed = Math.max(
                    0,
                    current.bytesUsed - Number(bytes),
                  );
                }
                return { success: true };
              }
              if (sql.includes("DELETE FROM shares")) {
                const now = Number(values[0]);
                let changes = 0;
                for (const [id, row] of rows) {
                  if (row.expires_at <= now && changes < 500) {
                    rows.delete(id);
                    changes += 1;
                  }
                }
                return { success: true, meta: { changes } };
              }
              if (sql.includes("DELETE FROM post_limits")) {
                const cutoff = Number(values[0]);
                let changes = 0;
                for (const [key, row] of limits) {
                  if (row.windowStart < cutoff && changes < 500) {
                    limits.delete(key);
                    changes += 1;
                  }
                }
                return { success: true, meta: { changes } };
              }
              if (sql.startsWith("INSERT INTO shares")) {
                const [
                  id,
                  source,
                  createdAt,
                  expiresAt,
                  sourceHash,
                  revokeHash,
                ] = values;
                rows.set(String(id), {
                  id: String(id),
                  source: String(source),
                  created_at: Number(createdAt),
                  expires_at: Number(expiresAt),
                  source_hash: sourceHash ? String(sourceHash) : undefined,
                  revoke_hash: revokeHash ? String(revokeHash) : undefined,
                });
              }
              return { success: true };
            },
            async first<T>(): Promise<T | null> {
              queries.push({ sql, values });
              if (
                sql.startsWith(
                  "UPDATE post_limits SET bytes_used = bytes_used +",
                )
              ) {
                const [bytes, key, windowStart, , maxBytes] = values;
                const current = limits.get(`${key}:${windowStart}`);
                if (
                  !current ||
                  current.bytesUsed + Number(bytes) > Number(maxBytes)
                ) {
                  return null;
                }
                current.bytesUsed += Number(bytes);
                return { bytes_used: current.bytesUsed } as T;
              }
              if (sql.includes("post_limits")) {
                const key = `${values[0]}:${values[1]}`;
                const current = limits.get(key);
                if (sql.includes("bytes_used")) {
                  const bytesUsed = Number(values[2]);
                  const maxCount = Number(values[3]);
                  const maxBytes = Number(values[4]);
                  if (
                    current &&
                    (current.count >= maxCount ||
                      current.bytesUsed + bytesUsed > maxBytes)
                  ) {
                    return null;
                  }
                  if (bytesUsed > maxBytes) return null;
                  const next = {
                    count: (current?.count ?? 0) + 1,
                    bytesUsed: (current?.bytesUsed ?? 0) + bytesUsed,
                    windowStart: Number(values[1]),
                  };
                  limits.set(key, next);
                  return { count: next.count } as T;
                }
                const next = (current?.count ?? 0) + 1;
                limits.set(key, {
                  count: next,
                  bytesUsed: current?.bytesUsed ?? 0,
                  windowStart: Number(values[1]),
                });
                return { count: next } as T;
              }
              if (sql.startsWith("SELECT id FROM shares WHERE source_hash")) {
                const sourceHash = String(values[0]);
                const now = Number(values[1]);
                const existing = Array.from(rows.values()).find(
                  (row) =>
                    row.source_hash === sourceHash && row.expires_at > now,
                );
                await afterSourceLookup?.(existing !== undefined);
                return existing ? ({ id: existing.id } as T) : null;
              }
              if (sql.startsWith("UPDATE shares SET expires_at = ?")) {
                const [expiresAt, sourceHash, now] = values;
                const existing = Array.from(rows.values()).find(
                  (row) =>
                    row.source_hash === sourceHash &&
                    row.expires_at > Number(now),
                );
                if (!existing) return null;
                existing.expires_at = Number(expiresAt);
                return { id: existing.id } as T;
              }
              if (
                sql.startsWith("INSERT INTO shares") &&
                sql.includes("RETURNING id")
              ) {
                const [id, source, createdAt, expiresAt, sourceHash] = values;
                const existing = Array.from(rows.values()).find(
                  (row) => row.source_hash === sourceHash,
                );
                if (existing) {
                  existing.expires_at = Number(expiresAt);
                  return { id: existing.id } as T;
                }
                const row = {
                  id: String(id),
                  source: String(source),
                  created_at: Number(createdAt),
                  expires_at: Number(expiresAt),
                  source_hash: String(sourceHash),
                };
                rows.set(row.id, row);
                return { id: row.id } as T;
              }
              const row = rows.get(String(values[0]));
              if (!row) return null;
              if (
                sql.includes("expires_at > ?") &&
                row.expires_at <= Number(values[1])
              ) {
                return null;
              }
              return row as T;
            },
          };
        },
      };
    },
  };
}
