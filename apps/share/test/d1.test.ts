import { describe, expect, it } from "vitest";
import { deleteShare, findActiveShare, insertShare } from "../src/d1.js";
import { createFakeD1 } from "./fake-d1.js";

const DAY = 24 * 60 * 60 * 1000;

describe("share D1", () => {
  it("inserts with bound parameters and reads an active row", async () => {
    const db = createFakeD1();
    const now = 1_700_000_000_000;

    await insertShare(db, {
      id: "abc_XYZ-12",
      source: "provider aws",
      createdAt: now,
      expiresAt: now + 30 * DAY,
    });

    const row = await findActiveShare(db, "abc_XYZ-12", now + DAY);
    expect(row).toEqual({
      id: "abc_XYZ-12",
      source: "provider aws",
      createdAt: now,
      expiresAt: now + 30 * DAY,
    });
    expect(db.queries.every((query) => query.sql.includes("?"))).toBe(true);
    expect(db.queries.every((query) => !query.sql.includes("abc_XYZ-12"))).toBe(
      true,
    );
    expect(db.queries[0]?.values).toEqual([
      "abc_XYZ-12",
      "provider aws",
      now,
      now + 30 * DAY,
      null,
      null,
    ]);
  });

  it("treats an expired row as missing", async () => {
    const db = createFakeD1();
    const now = 1_700_000_000_000;
    await insertShare(db, {
      id: "abc_XYZ-12",
      source: "provider aws",
      createdAt: now - 40 * DAY,
      expiresAt: now - DAY,
    });

    expect(await findActiveShare(db, "abc_XYZ-12", now)).toBeNull();
    expect(
      db.queries.some((query) => query.sql.includes("expires_at > ?")),
    ).toBe(true);
  });

  it("does not query an id outside the charset", async () => {
    const db = createFakeD1();
    expect(await findActiveShare(db, "id' OR 1=1", Date.now())).toBeNull();
    expect(db.queries).toHaveLength(0);
  });

  it("persists revoke_hash and allows deleting an active share", async () => {
    const db = createFakeD1();
    const now = 1_700_000_000_000;

    await insertShare(db, {
      id: "abc_XYZ-12",
      source: "provider aws",
      createdAt: now,
      expiresAt: now + 30 * DAY,
      sourceHash: "source-hash-1",
      revokeHash: "revoke-hash-1",
    });

    const active = await findActiveShare(db, "abc_XYZ-12", now + DAY);
    expect(active?.revokeHash).toBe("revoke-hash-1");

    const deleted = await deleteShare(db, "abc_XYZ-12");
    expect(deleted).toBe(true);

    const missing = await findActiveShare(db, "abc_XYZ-12", now + DAY);
    expect(missing).toBeNull();
  });
});
