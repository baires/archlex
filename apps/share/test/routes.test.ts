import type { PreparedDiagram } from "@archlex/core";
import { describe, expect, it, vi } from "vitest";
import { BYTES_PER_IP_PER_DAY, deleteExpiredShares } from "../src/d1.js";
import type { ShareEnv } from "../src/env.js";
import worker from "../src/index.js";
import { hashShareSource } from "../src/security.js";
import { createAllowingRateLimit, createFakeD1 } from "./fake-d1.js";

const SOURCE = 'provider aws\ncdn: cloudfront["CDN"]\n';
const SERVICE_TOKEN = ["service", "secret"].join("-");

function env(overrides: Partial<ShareEnv> = {}): ShareEnv {
  const rateLimit = createAllowingRateLimit();
  return {
    DB: createFakeD1(),
    SHARE_POST_LIMITER: rateLimit,
    SHARE_SERVICE_POST_LIMITER: rateLimit,
    SHARE_RENDER_LIMITER: rateLimit,
    SHARE_RENDER_GLOBAL_LIMITER: rateLimit,
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

  it("does not serve a cached image after its share has been revoked", async () => {
    const cachedImage = new Response("cached svg", {
      headers: { "content-type": "image/svg+xml" },
    });
    const cache = {
      match: vi.fn(async () => cachedImage.clone()),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => true),
    };
    vi.stubGlobal("caches", { default: cache });

    try {
      const response = await worker.fetch(
        new Request("https://share.archlex.dev/s/abc_XYZ-12.svg"),
        env({ DB: createFakeD1() }),
      );

      expect(cache.match).toHaveBeenCalledOnce();
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('{"error":"not_found"}');
    } finally {
      vi.unstubAllGlobals();
    }
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
      revokeToken: string;
      playgroundUrl: string;
      svgUrl: string;
      pngUrl: string;
    };
    expect(body.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(body.revokeToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
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

  it("mints independent shares for identical source and leaves the first expires_at unchanged", async () => {
    const database = createFakeD1();
    const now = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const post = () =>
        worker.fetch(
          new Request("https://share.archlex.dev/v1/shares", {
            method: "POST",
            headers: { "cf-connecting-ip": "203.0.113.19" },
            body: JSON.stringify({ source: SOURCE }),
          }),
          env({ DB: database }),
        );

      const first = await post();
      const firstBody = (await first.json()) as {
        id: string;
        revokeToken: string;
      };

      vi.setSystemTime(now + 10_000);
      const second = await post();
      const secondBody = (await second.json()) as {
        id: string;
        revokeToken: string;
      };

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(firstBody.id).not.toBe(secondBody.id);
      expect(firstBody.revokeToken).not.toBe(secondBody.revokeToken);
      expect(database.rows.size).toBe(2);

      const firstRow = database.rows.get(firstBody.id);
      const secondRow = database.rows.get(secondBody.id);
      expect(firstRow?.expires_at).toBe(now + 30 * 24 * 60 * 60 * 1000);
      expect(secondRow?.expires_at).toBe(
        now + 10_000 + 30 * 24 * 60 * 60 * 1000,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects the 201st post from one IP in a UTC day", async () => {
    const database = createFakeD1();
    const dayStart = 1_700_006_400_000;
    let allowed = 0;

    vi.useFakeTimers();
    try {
      for (let index = 0; index < 201; index += 1) {
        vi.setSystemTime(
          dayStart + Math.floor((index * 24 * 60 * 60 * 1000) / 201),
        );
        const response = await worker.fetch(
          new Request("https://share.archlex.dev/v1/shares", {
            method: "POST",
            headers: { "cf-connecting-ip": "203.0.113.20" },
            body: JSON.stringify({ source: SOURCE }),
          }),
          env({ DB: database }),
        );
        if (response.status === 201) allowed += 1;
        if (index === 200) {
          expect(response.status).toBe(429);
          expect(await response.json()).toEqual({ error: "rate_limited" });
        }
      }
    } finally {
      vi.useRealTimers();
    }

    expect(allowed).toBe(200);
    expect(
      database.queries.filter((query) =>
        query.sql.includes("INSERT INTO shares"),
      ),
    ).toHaveLength(200);
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

  it("rejects sources with more than 2,000 lines before inserting", async () => {
    const database = createFakeD1();
    const renderSvg = vi.fn(async () => "<svg></svg>");
    const source = `${Array.from({ length: 2_001 }, () => "lambda").join("\n")}`;
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source }),
      }),
      env({ DB: database, renderSvg }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "diagram_too_large" });
    expect(database.rows.size).toBe(0);
    expect(renderSvg).not.toHaveBeenCalled();
  });

  it.each([
    [
      "more than 200 nodes",
      { nodes: 201, edges: 0 },
      [],
      413,
      "diagram_too_large",
    ],
    [
      "more than 400 edges",
      { nodes: 2, edges: 401 },
      [],
      413,
      "diagram_too_large",
    ],
  ])(
    "rejects %s before inserting",
    async (_label, counts, diagnostics, status, error) => {
      const database = createFakeD1();
      const renderSvg = vi.fn(async () => "<svg></svg>");
      const response = await worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          body: JSON.stringify({ source: SOURCE }),
        }),
        env({
          DB: database,
          renderSvg,
          prepare: () =>
            preparedDiagram(counts.nodes, counts.edges, diagnostics),
        }),
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
      expect(database.rows.size).toBe(0);
      expect(renderSvg).not.toHaveBeenCalled();
    },
  );

  it("rejects a source with a parse error before inserting", async () => {
    const database = createFakeD1();
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: "runtime-service ->\nunknown-service" }),
      }),
      env({ DB: database }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(database.rows.size).toBe(0);
  });

  it("limits service-token calls without a caller key as service:anonymous", async () => {
    const database = createFakeD1();
    const post = () =>
      worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          headers: {
            "cf-connecting-ip": "203.0.113.9",
            authorization: `Bearer ${SERVICE_TOKEN}`,
          },
          body: JSON.stringify({ source: SOURCE }),
        }),
        {
          DB: database,
          SHARE_SERVICE_TOKEN: SERVICE_TOKEN,
          SHARE_POST_LIMITER: createAllowingRateLimit(),
          SHARE_SERVICE_POST_LIMITER: createAllowingRateLimit(),
          SHARE_RENDER_LIMITER: createAllowingRateLimit(),
          SHARE_RENDER_GLOBAL_LIMITER: createAllowingRateLimit(),
        },
      );

    for (let i = 0; i < 30; i += 1) {
      expect((await post()).status).toBe(201);
    }
    const blocked = await post();

    expect(blocked.status).toBe(429);
    expect(database.rows.size).toBe(30);
  });

  it("limits valid service caller keys independently", async () => {
    const database = createFakeD1();
    const post = (callerKey: string) =>
      worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          headers: {
            authorization: `Bearer ${SERVICE_TOKEN}`,
            "x-archlex-client": callerKey,
          },
          body: JSON.stringify({ source: SOURCE }),
        }),
        env({ DB: database, SHARE_SERVICE_TOKEN: SERVICE_TOKEN }),
      );

    for (let i = 0; i < 30; i += 1) {
      expect((await post("caller_000000000001")).status).toBe(201);
    }
    expect((await post("caller_000000000001")).status).toBe(429);
    expect((await post("caller_000000000002")).status).toBe(201);
  });

  it("uses service:anonymous for an invalid caller key", async () => {
    const database = createFakeD1();
    const post = () =>
      worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          headers: {
            authorization: `Bearer ${SERVICE_TOKEN}`,
            "x-archlex-client": "short",
          },
          body: JSON.stringify({ source: SOURCE }),
        }),
        env({ DB: database, SHARE_SERVICE_TOKEN: SERVICE_TOKEN }),
      );

    for (let i = 0; i < 30; i += 1) {
      expect((await post()).status).toBe(201);
    }
    expect((await post()).status).toBe(429);
  });

  it("ignores the caller key header for unauthenticated requests", async () => {
    const database = createFakeD1();
    const post = (callerKey: string) =>
      worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          headers: {
            "cf-connecting-ip": "203.0.113.41",
            "x-archlex-client": callerKey,
          },
          body: JSON.stringify({ source: SOURCE }),
        }),
        env({ DB: database }),
      );

    for (let i = 0; i < 30; i += 1) {
      expect((await post("attacker_00000001")).status).toBe(201);
    }
    expect((await post("attacker_00000002")).status).toBe(429);
  });

  it("uses a separate edge limiter for service-token posts", async () => {
    const blockedServiceLimiter = {
      async limit() {
        return { success: false };
      },
    };
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        headers: { authorization: `Bearer ${SERVICE_TOKEN}` },
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({
        SHARE_SERVICE_TOKEN: SERVICE_TOKEN,
        SHARE_SERVICE_POST_LIMITER: blockedServiceLimiter,
      }),
    );

    expect(response.status).toBe(429);
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

function preparedDiagram(
  nodeCount: number,
  edgeCount: number,
  diagnostics: PreparedDiagram["diagnostics"],
): PreparedDiagram {
  return {
    ast: {
      type: "document",
      statements: [],
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
      },
    },
    graph: {
      nodes: Array.from({ length: nodeCount }, (_, index) => ({
        id: `node-${index}`,
        provider: "aws",
        serviceKind: "lambda",
        label: `Node ${index}`,
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
      })),
      edges: Array.from({ length: edgeCount }, (_, index) => ({
        id: `edge-${index}`,
        source: "node-0",
        target: "node-1",
        arrow: "->",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
      })),
      scopes: [],
    },
    diagnostics,
    iconRequests: [],
  };
}

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
    const { id, revokeToken } = (await created.json()) as {
      id: string;
      revokeToken: string;
    };

    const response = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        headers: { origin: "https://playground.archlex.dev" },
      }),
      env({ DB: database }),
    );

    expect(response.status).toBe(200);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toEqual({ source: SOURCE });
    expect(responseText).not.toContain(revokeToken);
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

describe("GET /s/:id.svg", () => {
  it("serves SVG with no-source and base-URI sandbox headers", async () => {
    const database = createFakeD1();
    const id = "abc_XYZ-12";
    database.rows.set(id, {
      id,
      source: SOURCE,
      created_at: Date.now(),
      expires_at: Date.now() + 60_000,
    });

    const response = await worker.fetch(
      new Request(`https://share.archlex.dev/s/${id}.svg`),
      env({
        DB: database,
        renderSvg: async () =>
          '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; base-uri 'none'; sandbox",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toContain("<path");
  });
});

describe("DELETE /v1/shares/:id", () => {
  it("returns 204 with cache-control no-store for a valid token and removes the share", async () => {
    const database = createFakeD1();
    const created = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({ DB: database }),
    );
    const { id, revokeToken } = (await created.json()) as {
      id: string;
      revokeToken: string;
    };

    const getBefore = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`),
      env({ DB: database }),
    );
    expect(getBefore.status).toBe(200);

    const deleted = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        method: "DELETE",
        headers: {
          origin: "https://playground.archlex.dev",
          authorization: `Bearer ${revokeToken}`,
        },
      }),
      env({ DB: database }),
    );

    expect(deleted.status).toBe(204);
    expect(deleted.headers.get("cache-control")).toContain("no-store");
    expect(deleted.headers.get("access-control-allow-origin")).toBe(
      "https://playground.archlex.dev",
    );

    const getAfter = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`),
      env({ DB: database }),
    );
    expect(getAfter.status).toBe(404);
  });

  it("returns 404 for a wrong token and leaves the row in the database", async () => {
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
        method: "DELETE",
        headers: {
          authorization: "Bearer wrong-secret-token",
        },
      }),
      env({ DB: database }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });

    const getAfter = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`),
      env({ DB: database }),
    );
    expect(getAfter.status).toBe(200);
  });

  it("returns 404 when authorization header is missing or not bearer", async () => {
    const database = createFakeD1();
    const created = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({ DB: database }),
    );
    const { id, revokeToken } = (await created.json()) as {
      id: string;
      revokeToken: string;
    };

    const noHeader = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        method: "DELETE",
      }),
      env({ DB: database }),
    );
    expect(noHeader.status).toBe(404);

    const basicAuth = await worker.fetch(
      new Request(`https://share.archlex.dev/v1/shares/${id}`, {
        method: "DELETE",
        headers: { authorization: `Basic ${revokeToken}` },
      }),
      env({ DB: database }),
    );
    expect(basicAuth.status).toBe(404);
  });

  it("returns 404 for an expired row or unknown id", async () => {
    const database = createFakeD1();
    const missing = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares/nonexistent", {
        method: "DELETE",
        headers: { authorization: "Bearer some-token" },
      }),
      env({ DB: database }),
    );
    expect(missing.status).toBe(404);

    const now = 1_700_000_000_000;
    database.rows.set("expired-id", {
      id: "expired-id",
      source: SOURCE,
      created_at: now - 40 * 24 * 60 * 60 * 1000,
      expires_at: now - 1000,
      revoke_hash: "hash",
    });
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const expired = await worker.fetch(
        new Request("https://share.archlex.dev/v1/shares/expired-id", {
          method: "DELETE",
          headers: { authorization: "Bearer some-token" },
        }),
        env({ DB: database }),
      );
      expect(expired.status).toBe(404);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rate-limits DELETE requests via the post limiter", async () => {
    const database = createFakeD1();
    const blockedLimiter = {
      async limit() {
        return { success: false };
      },
    };

    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares/abc_XYZ-12", {
        method: "DELETE",
        headers: { authorization: "Bearer some-token" },
      }),
      env({ DB: database, SHARE_POST_LIMITER: blockedLimiter }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited" });
  });

  it("purges both cached image paths (.svg and .png) upon revoke", async () => {
    const database = createFakeD1();
    const created = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares", {
        method: "POST",
        body: JSON.stringify({ source: SOURCE }),
      }),
      env({ DB: database }),
    );
    const { id, revokeToken } = (await created.json()) as {
      id: string;
      revokeToken: string;
    };

    const deletedUrls: string[] = [];
    const cache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async (request: Request) => {
        deletedUrls.push(request.url);
        return true;
      }),
    };
    vi.stubGlobal("caches", { default: cache });

    try {
      const response = await worker.fetch(
        new Request(`https://share.archlex.dev/v1/shares/${id}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${revokeToken}` },
        }),
        env({ DB: database }),
      );

      expect(response.status).toBe(204);
      expect(deletedUrls).toContain(`https://share.archlex.dev/s/${id}.svg`);
      expect(deletedUrls).toContain(`https://share.archlex.dev/s/${id}.png`);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("answers preflight for DELETE on /v1/shares/:id", async () => {
    const response = await worker.fetch(
      new Request("https://share.archlex.dev/v1/shares/abc_XYZ-12", {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "DELETE",
          "access-control-request-headers": "authorization",
        },
      }),
      env(),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "DELETE",
    );
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "authorization",
    );
  });
});
