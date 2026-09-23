import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShareEnv } from "../src/env.js";
import worker from "../src/index.js";
import { resetRenderSlots } from "../src/render.js";
import { createAllowingRateLimit, createFakeD1 } from "./fake-d1.js";

const SOURCE = 'provider aws\napi: lambda["Orders"]\n';
const SECRET = "SECRET_SOURCE_DO_NOT_ECHO";

function env(overrides: Partial<ShareEnv> = {}): ShareEnv {
  const rateLimit = createAllowingRateLimit();
  return {
    DB: createFakeD1(),
    SHARE_POST_LIMITER: rateLimit,
    SHARE_RENDER_LIMITER: rateLimit,
    renderSvg: async () =>
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g/></svg>`,
    rasterize: async () =>
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ...overrides,
  };
}

async function createShare(
  database: ReturnType<typeof createFakeD1>,
  source = SOURCE,
): Promise<string> {
  const response = await worker.fetch(
    new Request("https://share.archlex.dev/v1/shares", {
      method: "POST",
      body: JSON.stringify({ source }),
    }),
    env({ DB: database }),
  );
  const body = (await response.json()) as { id: string };
  return body.id;
}

describe("image GET", () => {
  beforeEach(() => {
    resetRenderSlots();
  });

  it("returns sanitized svg with image headers and a bounded cache", async () => {
    const database = createFakeD1();
    const id = await createShare(database);

    const response = await worker.fetch(
      new Request(`https://share.archlex.dev/s/${id}.svg`),
      env({ DB: database }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; sandbox",
    );
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    const maxAge = Number(
      response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1],
    );
    expect(response.headers.get("cache-control")).toContain("public");
    expect(maxAge).toBeGreaterThan(30 * 24 * 60 * 60 - 10);
    expect(maxAge).toBeLessThanOrEqual(30 * 24 * 60 * 60);
    const text = await response.text();
    expect(text).not.toContain("script");
    expect(text).toContain("<svg");
  });

  it("returns a png from the rasterizer", async () => {
    const database = createFakeD1();
    const id = await createShare(database);
    const response = await worker.fetch(
      new Request(`https://share.archlex.dev/s/${id}.png`),
      env({ DB: database }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect([...(await response.bytes()).subarray(0, 4)]).toEqual([
      0x89, 0x50, 0x4e, 0x47,
    ]);
  });

  it("does not render an unknown or expired id", async () => {
    const database = createFakeD1();
    let rendered = 0;
    const hooks = env({
      DB: database,
      renderSvg: async () => {
        rendered += 1;
        return `<svg xmlns="http://www.w3.org/2000/svg"/>`;
      },
    });
    database.rows.set("expired1", {
      id: "expired1",
      source: SECRET,
      created_at: 1,
      expires_at: 1,
    });

    const missing = await worker.fetch(
      new Request("https://share.archlex.dev/s/missing1.svg"),
      hooks,
    );
    const expired = await worker.fetch(
      new Request("https://share.archlex.dev/s/expired1.png"),
      hooks,
    );

    expect(missing.status).toBe(404);
    expect(expired.status).toBe(404);
    expect(await missing.text()).not.toContain(SECRET);
    expect(rendered).toBe(0);
  });

  it("returns 503 when more than 4 renders are in flight", async () => {
    const database = createFakeD1();
    const id = await createShare(database, SECRET);
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = 0;
    const hooks = env({
      DB: database,
      renderSvg: async () => {
        started += 1;
        await gate;
        return `<svg xmlns="http://www.w3.org/2000/svg"/>`;
      },
    });

    const hanging = Array.from({ length: 4 }, () =>
      worker.fetch(new Request(`https://share.archlex.dev/s/${id}.svg`), hooks),
    );
    await vi.waitFor(() => expect(started).toBe(4));
    const blocked = await worker.fetch(
      new Request(`https://share.archlex.dev/s/${id}.svg`),
      hooks,
    );

    expect(blocked.status).toBe(503);
    expect(await blocked.text()).not.toContain(SECRET);
    release();
    await Promise.all(hanging);
  });

  it("renders a tiny arch source to svg and png", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );
    try {
      const database = createFakeD1();
      const created = await worker.fetch(
        new Request("https://share.archlex.dev/v1/shares", {
          method: "POST",
          body: JSON.stringify({ source: SOURCE }),
        }),
        {
          DB: database,
          SHARE_POST_LIMITER: createAllowingRateLimit(),
          SHARE_RENDER_LIMITER: createAllowingRateLimit(),
        },
      );
      const { id } = (await created.json()) as { id: string };
      const hooks = {
        DB: database,
        SHARE_POST_LIMITER: createAllowingRateLimit(),
        SHARE_RENDER_LIMITER: createAllowingRateLimit(),
      };
      const svg = await worker.fetch(
        new Request(`https://share.archlex.dev/s/${id}.svg`),
        hooks,
      );
      const png = await worker.fetch(
        new Request(`https://share.archlex.dev/s/${id}.png`),
        hooks,
      );

      expect(svg.status).toBe(200);
      expect(svg.headers.get("content-type")).toBe("image/svg+xml");
      expect(await svg.text()).toContain("<svg");
      expect(png.status).toBe(200);
      expect(png.headers.get("content-type")).toBe("image/png");
      expect([...(await png.bytes()).subarray(0, 8)]).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
