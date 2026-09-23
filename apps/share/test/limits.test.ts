import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deleteExpiredShares } from "../src/d1.js";
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
