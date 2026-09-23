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
}

interface LimitRow {
  count: number;
  bytesUsed: number;
  windowStart: number;
}

export interface FakeD1 extends ShareD1 {
  queries: RecordedQuery[];
  rows: Map<string, ShareRow>;
}

export function createAllowingRateLimit(): RateLimitBinding {
  return {
    async limit() {
      return { success: true };
    },
  };
}

export function createFakeD1(): FakeD1 {
  const queries: RecordedQuery[] = [];
  const rows = new Map<string, ShareRow>();
  const limits = new Map<string, LimitRow>();

  return {
    queries,
    rows,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              queries.push({ sql, values });
              if (sql.includes("DELETE FROM shares")) {
                const now = Number(values[0]);
                for (const [id, row] of rows) {
                  if (row.expires_at <= now) rows.delete(id);
                }
                return { success: true };
              }
              if (sql.includes("DELETE FROM post_limits")) {
                const cutoff = Number(values[0]);
                for (const [key, row] of limits) {
                  if (row.windowStart < cutoff) limits.delete(key);
                }
                return { success: true };
              }
              if (sql.startsWith("INSERT INTO shares")) {
                const [id, source, createdAt, expiresAt] = values;
                rows.set(String(id), {
                  id: String(id),
                  source: String(source),
                  created_at: Number(createdAt),
                  expires_at: Number(expiresAt),
                });
              }
              return { success: true };
            },
            async first<T>(): Promise<T | null> {
              queries.push({ sql, values });
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
