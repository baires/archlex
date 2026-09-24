import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ShareD1 } from "../src/d1.js";
import {
  BYTES_PER_IP_PER_DAY,
  consumeDailyPostBudget,
  consumePostLimit,
  deleteExpiredPostLimits,
  deleteExpiredShares,
} from "../src/d1.js";
import worker from "../src/index.js";
import { createAllowingRateLimit, createFakeD1 } from "./fake-d1.js";

const SOURCE = 'provider aws\napi: lambda["Orders"]\n';

describe("POST rate limit", () => {
  it("rejects the 31st post from one IP and does not store it", async () => {
    const database = createFakeD1();
    const post = () =>
      worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          headers: { "cf-connecting-ip": "203.0.113.8" },
          body: JSON.stringify({ source: SOURCE }),
        }),
        {
          DB: database,
          SHARE_POST_LIMITER: createAllowingRateLimit(),
          SHARE_RENDER_LIMITER: createAllowingRateLimit(),
        },
      );

    const created = [];
    for (let i = 0; i < 30; i += 1) created.push(await post());
    const blocked = await post();

    expect(created.every((response) => response.status === 201)).toBe(true);
    expect(blocked.status).toBe(429);
    const text = await blocked.text();
    expect(JSON.parse(text)).toEqual({ error: "rate_limited" });
    expect(text).not.toContain("lambda");
    expect(database.rows.size).toBe(30);
    const limitQuery = database.queries.find((query) =>
      query.sql.includes("post_limits"),
    );
    expect(limitQuery?.sql).toContain("?");
    expect(limitQuery?.sql).not.toContain(SOURCE);
    expect(limitQuery?.values).not.toContain(SOURCE);
  });
});

describe("expired share cleanup", () => {
  it("deletes rows at or before now with a bound parameter", async () => {
    const database = createFakeD1();
    const now = 1_700_000_000_000;
    database.rows.set("keep", {
      id: "keep",
      source: "live",
      created_at: now,
      expires_at: now + 1,
    });
    database.rows.set("drop", {
      id: "drop",
      source: "old",
      created_at: now - 10,
      expires_at: now,
    });

    await deleteExpiredShares(database, now);

    expect(database.rows.has("keep")).toBe(true);
    expect(database.rows.has("drop")).toBe(false);
    const deleted = database.queries.find((query) =>
      query.sql.includes("DELETE"),
    );
    expect(deleted?.sql).toContain("expires_at <= ?");
    expect(deleted?.values).toEqual([now]);
    expect(
      database.queries.filter((query) =>
        query.sql.includes("DELETE FROM shares"),
      ),
    ).toHaveLength(1);
  });

  it("runs the delete from the scheduled handler", async () => {
    const database = createFakeD1();
    await worker.scheduled?.(
      {} as Parameters<NonNullable<typeof worker.scheduled>>[0],
      { DB: database },
      {} as Parameters<NonNullable<typeof worker.scheduled>>[2],
    );

    expect(
      database.queries.some((query) => query.sql.includes("expires_at <= ?")),
    ).toBe(true);
  });

  it("schedules a daily cron", () => {
    const wrangler = JSON.parse(
      readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"),
    ) as { triggers?: { crons?: string[] } };
    expect(wrangler.triggers?.crons?.length).toBeGreaterThan(0);
  });
});

describe("daily post budgets", () => {
  it("keeps the hourly and daily rows separate at UTC midnight", async () => {
    const database = createFakeD1();
    const midnight = 1_700_006_400_000;

    for (let post = 0; post < 30; post += 1) {
      expect(await consumePostLimit(database, "203.0.113.5", midnight)).toBe(
        true,
      );
      expect(
        await consumeDailyPostBudget(database, "203.0.113.5", midnight, 0),
      ).toBe(true);
    }

    expect(await consumePostLimit(database, "203.0.113.5", midnight)).toBe(
      false,
    );
    expect(
      await consumeDailyPostBudget(database, "203.0.113.5", midnight, 0),
    ).toBe(true);
  });

  it("limits an IP to 200 posts across fresh hourly windows", async () => {
    const database = createFakeD1();
    const dayStart = 1_700_006_400_000;
    let accepted = 0;

    for (let post = 0; post < 201; post += 1) {
      const allowed = await consumeDailyPostBudget(
        database,
        "203.0.113.5",
        dayStart + Math.floor((post * 24 * 60 * 60 * 1000) / 201),
        10,
      );
      if (allowed) accepted += 1;
    }

    expect(accepted).toBe(200);
  });

  it("limits source bytes per IP independently of the global breaker", async () => {
    const database = createFakeD1();
    const now = 1_700_006_400_000;

    expect(
      await consumeDailyPostBudget(
        database,
        "203.0.113.5",
        now,
        BYTES_PER_IP_PER_DAY,
      ),
    ).toBe(true);
    expect(await consumeDailyPostBudget(database, "203.0.113.5", now, 1)).toBe(
      false,
    );
  });

  it("fails closed when a quota statement returns no row", async () => {
    const noRows: ShareD1 = {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                return { success: true };
              },
              async first() {
                return null;
              },
            };
          },
        };
      },
    };
    let dailyStatements = 0;
    const globalMissing: ShareD1 = {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                return { success: true };
              },
              async first<T>() {
                dailyStatements += 1;
                return (
                  dailyStatements === 1 ? { count: 1 } : null
                ) as T | null;
              },
            };
          },
        };
      },
    };

    expect(
      await consumePostLimit(noRows, "203.0.113.5", 1_700_000_000_000),
    ).toBe(false);
    expect(
      await consumeDailyPostBudget(noRows, "203.0.113.5", 1_700_000_000_000, 0),
    ).toBe(false);
    expect(
      await consumeDailyPostBudget(
        globalMissing,
        "203.0.113.5",
        1_700_000_000_000,
        0,
      ),
    ).toBe(false);
  });

  it("caps each IP while keeping the global circuit breaker above 1,000", async () => {
    const database = createFakeD1();
    const now = 1_700_006_400_000;
    for (let ipIndex = 0; ipIndex < 6; ipIndex += 1) {
      for (let postIndex = 0; postIndex < 200; postIndex += 1) {
        expect(
          await consumeDailyPostBudget(
            database,
            `203.0.113.${ipIndex + 1}`,
            now,
            0,
          ),
        ).toBe(true);
      }
    }

    expect(await consumeDailyPostBudget(database, "203.0.113.7", now, 0)).toBe(
      true,
    );
  });
});

describe("bounded expired cleanup", () => {
  it("limits each delete statement to 500 rows and stops at 20 batches", async () => {
    const database = createFakeD1();
    const now = 1_700_000_000_000;
    for (let i = 0; i < 11_000; i += 1) {
      database.rows.set(`expired-${i}`, {
        id: `expired-${i}`,
        source: "old",
        created_at: now - 10,
        expires_at: now,
      });
    }

    await deleteExpiredShares(database, now);

    const deletes = database.queries.filter((query) =>
      query.sql.includes("DELETE FROM shares"),
    );
    expect(deletes).toHaveLength(20);
    expect(deletes.every((query) => /LIMIT\s+500/i.test(query.sql))).toBe(true);
    expect(database.rows.size).toBe(1_000);
  });

  it("batches expired post-limit cleanup", async () => {
    const database = createFakeD1();
    const now = 1_700_006_400_000;
    const oldWindow = now - 2 * 24 * 60 * 60 * 1000;
    for (let index = 0; index < 501; index += 1) {
      await consumePostLimit(database, `203.0.113.${index}`, oldWindow);
    }

    await deleteExpiredPostLimits(database, now);

    const deletes = database.queries.filter((query) =>
      query.sql.includes("DELETE FROM post_limits"),
    );
    expect(deletes).toHaveLength(2);
    expect(deletes.every((query) => /LIMIT\s+500/i.test(query.sql))).toBe(true);
  });
});
