import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/index.js";
import {
  checkRateLimit,
  getClientIp,
  inMemoryRateLimiter,
  parseRenderUrlConfig,
  validateAuthentication,
  validateOrigin,
  validatePayloadSize,
} from "../src/security.js";

describe("MCP Security Middleware", () => {
  beforeEach(() => {
    inMemoryRateLimiter.reset();
  });

  describe("validateAuthentication", () => {
    it("allows request when MCP_AUTH_TOKEN is not configured", () => {
      const request = new Request("https://mcp.archlex.dev/sse");
      const result = validateAuthentication(request, {});
      expect(result.authorized).toBe(true);
    });

    it("rejects request when MCP_AUTH_TOKEN is configured but token is missing", () => {
      const request = new Request("https://mcp.archlex.dev/sse");
      const result = validateAuthentication(request, {
        MCP_AUTH_TOKEN: "secret-token-123",
      });
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
    });

    it("accepts request with valid Authorization Bearer header", () => {
      const request = new Request("https://mcp.archlex.dev/sse", {
        headers: { Authorization: "Bearer secret-token-123" },
      });
      const result = validateAuthentication(request, {
        MCP_AUTH_TOKEN: "secret-token-123",
      });
      expect(result.authorized).toBe(true);
    });

    it("rejects query credentials even when the token is valid", () => {
      const request = new Request(
        "https://mcp.archlex.dev/sse?token=secret-token-123",
      );
      const result = validateAuthentication(request, {
        MCP_AUTH_TOKEN: "secret-token-123",
      });
      expect(result.authorized).toBe(false);
    });
  });

  describe("validateOrigin", () => {
    it("allows non-browser requests without Origin header", () => {
      const request = new Request("https://mcp.archlex.dev/sse");
      expect(
        validateOrigin(request, {
          ALLOWED_ORIGINS: "https://playground.archlex.dev",
        }),
      ).toBe(true);
    });

    it("rejects requests with unauthorized Origin header", () => {
      const request = new Request("https://mcp.archlex.dev/sse", {
        headers: { Origin: "https://malicious-site.com" },
      });
      expect(
        validateOrigin(request, {
          ALLOWED_ORIGINS: "https://playground.archlex.dev",
        }),
      ).toBe(false);
    });
  });

  describe("getClientIp", () => {
    it("keys only on CF-Connecting-IP", () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: {
          "cf-connecting-ip": "2001:db8::1",
          "x-forwarded-for": "198.51.100.8, 203.0.113.1",
        },
      });
      expect(getClientIp(request)).toBe("2001:db8::1");
    });

    it("uses unknown when CF-Connecting-IP is absent or unusable", () => {
      expect(
        getClientIp(
          new Request("https://mcp.archlex.dev/health", {
            headers: { "x-forwarded-for": "198.51.100.8" },
          }),
        ),
      ).toBe("unknown");
      expect(
        getClientIp(
          new Request("https://mcp.archlex.dev/health", {
            headers: { "cf-connecting-ip": "198.51.100.8, 203.0.113.1" },
          }),
        ),
      ).toBe("unknown");
      expect(getClientIp(new Request("https://mcp.archlex.dev/health"))).toBe(
        "unknown",
      );
    });
  });

  describe("checkRateLimit", () => {
    const localEnv = {
      ENVIRONMENT: "test",
      RATE_LIMIT_MAX_REQUESTS: "5",
      RATE_LIMIT_WINDOW_SECONDS: "60",
    };

    it("allows requests within the local fallback limit", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.195" },
      });

      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(request, localEnv);
        expect(res.allowed).toBe(true);
      }
    });

    it("blocks the local fallback with 429 Too Many Requests", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.195" },
      });
      const env = { ...localEnv, RATE_LIMIT_MAX_REQUESTS: "3" };

      for (let i = 0; i < 3; i++) {
        await checkRateLimit(request, env);
      }

      const res = await checkRateLimit(request, env);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(429);
      expect(res.headers?.["Retry-After"]).toBeDefined();
    });

    it("shares the unknown key and ignores X-Forwarded-For", async () => {
      const env = { ...localEnv, RATE_LIMIT_MAX_REQUESTS: "1" };
      const forwarded = new Request("https://mcp.archlex.dev/health", {
        headers: { "x-forwarded-for": "198.51.100.8" },
      });
      const bare = new Request("https://mcp.archlex.dev/health");

      expect((await checkRateLimit(forwarded, env)).allowed).toBe(true);
      const blocked = await checkRateLimit(bare, env);
      expect(blocked.allowed).toBe(false);
      expect(blocked.status).toBe(429);
    });

    it("uses the RATE_LIMITER binding key", async () => {
      const keys: string[] = [];
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: {
          "cf-connecting-ip": "203.0.113.9",
          "x-forwarded-for": "198.51.100.8",
        },
      });
      const res = await checkRateLimit(request, {
        ENVIRONMENT: "production",
        RATE_LIMITER: {
          limit: async ({ key }) => {
            keys.push(key);
            return { success: true };
          },
        },
      });
      expect(res).toEqual({ allowed: true, status: 200 });
      expect(keys).toEqual(["203.0.113.9"]);
    });

    it("returns 429 when the binding rejects the request", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.9" },
      });
      const res = await checkRateLimit(request, {
        ENVIRONMENT: "production",
        RATE_LIMIT_WINDOW_SECONDS: "60",
        RATE_LIMITER: {
          limit: async () => ({ success: false }),
        },
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(429);
      expect(res.headers?.["Retry-After"]).toBe("60");
    });

    it("fails closed when the binding throws", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.7" },
      });
      const res = await checkRateLimit(request, {
        ENVIRONMENT: "test",
        RATE_LIMIT_MAX_REQUESTS: "1",
        RATE_LIMITER: {
          limit: async () => {
            throw new Error("binding down");
          },
        },
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(503);
      expect((await checkRateLimit(request, localEnv)).allowed).toBe(true);
    });

    it("fails closed in production when the binding is missing", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.50" },
      });
      const denied = await checkRateLimit(request, {
        ENVIRONMENT: "production",
        RATE_LIMIT_MAX_REQUESTS: "1",
      });
      expect(denied.allowed).toBe(false);
      expect(denied.status).toBe(503);
      expect(denied.message).toContain("Rate limiter is unavailable");
      expect((await checkRateLimit(request, localEnv)).allowed).toBe(true);
    });

    it("fails closed on the Workers runtime without an explicit local environment", async () => {
      const previous = globalThis.navigator;
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { userAgent: "Cloudflare-Workers" },
      });
      try {
        const res = await checkRateLimit(
          new Request("https://mcp.archlex.dev/health"),
        );
        expect(res.allowed).toBe(false);
        expect(res.status).toBe(503);
      } finally {
        Object.defineProperty(globalThis, "navigator", {
          configurable: true,
          value: previous,
        });
      }
    });
  });

  describe("validatePayloadSize", () => {
    it("rejects request when Content-Length exceeds max bytes limit", () => {
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "content-length": "1048576" }, // 1 MB
      });
      expect(validatePayloadSize(request, 512 * 1024)).toBe(false);
    });
  });

  describe("Worker HTTP Endpoint Security", () => {
    it("returns 401 Unauthorized for /health when token is required but omitted", async () => {
      const request = new Request("https://mcp.archlex.dev/health");
      const response = await worker.fetch(request, {
        MCP_AUTH_TOKEN: "secret-123",
      });
      expect(response.status).toBe(401);
    });

    it("returns 429 Too Many Requests when endpoint rate limit is exceeded", async () => {
      const env = {
        ENVIRONMENT: "test",
        RATE_LIMIT_MAX_REQUESTS: "2",
        RATE_LIMIT_WINDOW_SECONDS: "60",
      };

      const req1 = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });
      const req2 = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });
      const req3 = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });

      await worker.fetch(req1, env);
      await worker.fetch(req2, env);
      const res = await worker.fetch(req3, env);

      expect(res.status).toBe(429);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain("Too Many Requests");
    });

    it("returns 503 when production has no rate limit binding", async () => {
      const response = await worker.fetch(
        new Request("https://mcp.archlex.dev/health", {
          headers: { "cf-connecting-ip": "203.0.113.10" },
        }),
        { ENVIRONMENT: "production" },
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Retry-After")).toBe("60");
      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("Rate limiter is unavailable");
    });
  });

  describe("parseRenderUrlConfig", () => {
    it("defaults TTL to 600 seconds and max URL length to 7500", () => {
      expect(parseRenderUrlConfig()).toEqual({
        secret: "",
        ttlSeconds: 600,
        maxUrlLength: 7500,
      });
    });

    it("parses positive bounded integers from env", () => {
      expect(
        parseRenderUrlConfig({
          RENDER_URL_SECRET: "secret",
          RENDER_URL_TTL_SECONDS: "120",
          RENDER_URL_MAX_LENGTH: "4000",
        }),
      ).toEqual({
        secret: "secret",
        ttlSeconds: 120,
        maxUrlLength: 4000,
      });
    });
  });
});
