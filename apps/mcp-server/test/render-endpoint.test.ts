import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import { createRenderToken } from "../src/render-links.js";
import type { RenderLinkPayload } from "../src/render-links.js";

const SECRET = "test-secret-key-min-32-chars-long-for-aes-256";
const NOW = Date.now();

const SAMPLE_PAYLOAD: RenderLinkPayload = {
  version: 1,
  source: "provider aws\necs > rds",
  theme: "dark",
  direction: "LR",
  validation: "normal",
  expiresAt: NOW + 3600_000,
};

describe("Stateless render endpoint success", () => {
  it("renders PNG from valid token with proper headers and caching", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const request = new Request(`https://mcp.archlex.dev/renders/${token}.png`);
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("immutable");

    // Extract max-age value and verify it's less than token TTL
    const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/);
    expect(maxAgeMatch).toBeTruthy();
    const maxAge = Number.parseInt(maxAgeMatch?.[1] ?? "0", 10);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(3600);

    // Verify PNG signature
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});

describe("Stateless render endpoint security", () => {
  it("rejects expired tokens with generic error", async () => {
    const expiredPayload: RenderLinkPayload = {
      ...SAMPLE_PAYLOAD,
      expiresAt: NOW - 1000,
    };
    const token = await createRenderToken(expiredPayload, SECRET);
    const request = new Request(`https://mcp.archlex.dev/renders/${token}.png`);
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(JSON.stringify(body)).not.toContain(SAMPLE_PAYLOAD.source);
    expect(JSON.stringify(body)).not.toContain("decrypt");
    expect(JSON.stringify(body)).not.toContain("nonce");
  });

  it("rejects malformed tokens with generic error", async () => {
    const request = new Request(
      "https://mcp.archlex.dev/renders/invalid-token.png",
    );
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(JSON.stringify(body)).not.toContain("decrypt");
  });

  it("rejects tampered tokens with generic error", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const tampered =
      token.substring(0, token.length / 2) +
      (token[token.length / 2] === "A" ? "B" : "A") +
      token.substring(token.length / 2 + 1);
    const request = new Request(
      `https://mcp.archlex.dev/renders/${tampered}.png`,
    );
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(JSON.stringify(body)).not.toContain(SAMPLE_PAYLOAD.source);
  });

  it("rejects tokens with unsupported version", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const bytes = Uint8Array.from(
      atob(token.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    bytes[0] = 99; // Unsupported version
    const tamperedToken = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const request = new Request(
      `https://mcp.archlex.dev/renders/${tamperedToken}.png`,
    );
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("rejects tokens with parser-invalid source", async () => {
    const invalidPayload: RenderLinkPayload = {
      version: 1,
      source: "invalid -> -> syntax",
      expiresAt: NOW + 3600_000,
    };
    const token = await createRenderToken(invalidPayload, SECRET);
    const request = new Request(`https://mcp.archlex.dev/renders/${token}.png`);
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Invalid or expired token" });
    expect(JSON.stringify(body)).not.toContain("invalid -> -> syntax");
  });

  it("uses the same generic error body for malformed tokens", async () => {
    const request = new Request(
      "https://mcp.archlex.dev/renders/invalid-token.png",
    );
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid or expired token",
    });
  });
});

describe("Stateless render endpoint routing", () => {
  it("works without Authorization header even when MCP_AUTH_TOKEN is set", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const request = new Request(`https://mcp.archlex.dev/renders/${token}.png`);
    const response = await worker.fetch(request, {
      RENDER_URL_SECRET: SECRET,
      MCP_AUTH_TOKEN: "required-for-mcp-tools",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("ignores restrictive Origin configuration", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const request = new Request(
      `https://mcp.archlex.dev/renders/${token}.png`,
      {
        headers: { Origin: "https://evil.example.com" },
      },
    );
    const response = await worker.fetch(request, {
      RENDER_URL_SECRET: SECRET,
      ALLOWED_ORIGINS: "https://trusted.example.com",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("rejects non-GET requests with 405", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const request = new Request(
      `https://mcp.archlex.dev/renders/${token}.png`,
      {
        method: "POST",
      },
    );
    const response = await worker.fetch(request, { RENDER_URL_SECRET: SECRET });

    expect(response.status).toBe(405);
  });

  it("still applies rate limiting to render endpoint", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);

    // Create a mock rate limiter that always fails
    const mockRateLimiter = {
      limit: async () => ({ success: false }),
    };

    const request = new Request(`https://mcp.archlex.dev/renders/${token}.png`);
    const response = await worker.fetch(request, {
      RENDER_URL_SECRET: SECRET,
      RATE_LIMITER: mockRateLimiter,
    });

    expect(response.status).toBe(429);
  });
});
