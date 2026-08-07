import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/index.js";
import {
  checkRateLimit,
  inMemoryRateLimiter,
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

    it("accepts request with valid ?token= query parameter", () => {
      const request = new Request(
        "https://mcp.archlex.dev/sse?token=secret-token-123",
      );
      const result = validateAuthentication(request, {
        MCP_AUTH_TOKEN: "secret-token-123",
      });
      expect(result.authorized).toBe(true);
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

  describe("checkRateLimit", () => {
    it("allows requests within configured limit", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.195" },
      });
      const env = {
        RATE_LIMIT_MAX_REQUESTS: "5",
        RATE_LIMIT_WINDOW_SECONDS: "60",
      };

      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(request, env);
        expect(res.allowed).toBe(true);
      }
    });

    it("blocks request exceeding limit with 429 Too Many Requests", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { "cf-connecting-ip": "203.0.113.195" },
      });
      const env = {
        RATE_LIMIT_MAX_REQUESTS: "3",
        RATE_LIMIT_WINDOW_SECONDS: "60",
      };

      for (let i = 0; i < 3; i++) {
        await checkRateLimit(request, env);
      }

      const res = await checkRateLimit(request, env);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(429);
      expect(res.headers?.["Retry-After"]).toBeDefined();
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
  });
});
