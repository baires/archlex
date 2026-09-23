import { describe, expect, it } from "vitest";
import type { ShareEnv } from "../src/env.js";
import worker from "../src/index.js";
import { createAllowingRateLimit, createFakeD1 } from "./fake-d1.js";

const SOURCE = 'provider aws\ncdn: cloudfront["CDN"]\n';

function env(overrides: Partial<ShareEnv> = {}): ShareEnv {
  const rateLimit = createAllowingRateLimit();
  return {
    DB: createFakeD1(),
    SHARE_POST_LIMITER: rateLimit,
    SHARE_RENDER_LIMITER: rateLimit,
    ...overrides,
  };
}

describe("share worker", () => {
  it("returns 404 for unknown paths", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/"),
      env(),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 for an unknown image id", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/s/abc.svg"),
      env(),
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /v1/shares", () => {
  it("stores source and returns short urls without rendering", async () => {
    const database = createFakeD1();
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({ DB: database }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      id: string;
      playgroundUrl: string;
      svgUrl: string;
      pngUrl: string;
    };
    expect(body.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(body.playgroundUrl).toBe(`https://share.archlex.dev/s/${body.id}`);
    expect(body.svgUrl).toBe(`https://share.archlex.dev/s/${body.id}.svg`);
    expect(body.pngUrl).toBe(`https://share.archlex.dev/s/${body.id}.png`);
    const insert = database.queries.find((query) =>
      query.sql.includes("INSERT INTO shares"),
    );
    const createdAt = Number(insert?.values[2]);
    const expiresAt = Number(insert?.values[3]);
    expect(expiresAt - createdAt).toBe(30 * 24 * 60 * 60 * 1000);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("uses configured origins", async () => {
    const response = await worker.fetch(
      new Request("https://share.example/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({
        SHARE_ORIGIN: "https://share.example",
        PLAYGROUND_ORIGIN: "https://play.example",
      }),
    );

    const body = (await response.json()) as { playgroundUrl: string };
    expect(body.playgroundUrl).toBe(
      `https://share.example/s/${body.playgroundUrl.split("/").pop()}`,
    );
  });

  it("rejects a missing source without echoing the body", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: "not-json-SECRET",
      }),
      env(),
    );

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: "invalid_request" });
    expect(text).not.toContain("SECRET");
  });

  it("rejects an oversized source without echoing it", async () => {
    const source = "x".repeat(100_001);
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source }),
      }),
      env(),
    );

    expect(response.status).toBe(413);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: "payload_too_large" });
    expect(text).not.toContain(source);
  });

  it("skips the rate limit for a matching service token", async () => {
    const database = createFakeD1();
    const post = (token?: string) =>
      worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          headers: {
            "cf-connecting-ip": "203.0.113.9",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ source: SOURCE }),
        }),
        {
          DB: database,
          SHARE_SERVICE_TOKEN: "service-secret",
          SHARE_POST_LIMITER: createAllowingRateLimit(),
          SHARE_RENDER_LIMITER: createAllowingRateLimit(),
        },
      );

    for (let i = 0; i < 30; i += 1) await post();
    const blocked = await post();
    const allowed = await post("service-secret");

    expect(blocked.status).toBe(429);
    expect(allowed.status).toBe(201);
  });

  it("returns 503 when D1 is missing and does not echo source", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      {},
    );

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: "unavailable" });
    expect(text).not.toContain("cloudfront");
  });

  it("returns 503 when D1 throws and does not echo the database error", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      {
        DB: {
          prepare() {
            return {
              bind() {
                return {
                  async run() {
                    throw new Error(
                      "D1_ERROR: no such table: post_limits SECRET",
                    );
                  },
                  async first() {
                    throw new Error(
                      "D1_ERROR: no such table: post_limits SECRET",
                    );
                  },
                };
              },
            };
          },
        },
      },
    );

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: "unavailable" });
    expect(text).not.toContain("SECRET");
  });
});

describe("GET /v1/shares/:id", () => {
  it("returns source for an active id and allows the playground origin", async () => {
    const database = createFakeD1();
    const created = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({ DB: database }),
    );
    const { id } = (await created.json()) as { id: string };

    const response = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        headers: { origin: "https://playground.archlex.dev" },
      }),
      env({ DB: database }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: SOURCE });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://playground.archlex.dev",
    );
    expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("allows localhost and rejects other origins", async () => {
    const database = createFakeD1();
    const created = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({ DB: database }),
    );
    const { id } = (await created.json()) as { id: string };

    const local = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        headers: { origin: "http://localhost:5173" },
      }),
      env({ DB: database }),
    );
    const evil = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        headers: { origin: "https://evil.example" },
      }),
      env({ DB: database }),
    );

    expect(local.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
    expect(evil.status).toBe(200);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares/missing"),
      env(),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("answers preflight only for an allowed origin", async () => {
    const allowed = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "OPTIONS",
        headers: { origin: "http://127.0.0.1:5173" },
      }),
      env(),
    );
    const denied = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "OPTIONS",
        headers: { origin: "https://evil.example" },
      }),
      env(),
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:5173",
    );
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("GET /s/:id", () => {
  it("redirects to the playground without an HTML document", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/s/abc_XYZ-12"),
      env(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://playground.archlex.dev/?s=abc_XYZ-12",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    const text = await response.text();
    expect(text).not.toMatch(/<html|<!doctype/i);
  });

  it("returns 404 for an id outside the charset", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/s/ab%20c"),
      env(),
    );

    expect(response.status).toBe(404);
  });
});
