import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import {
  validateAuthentication,
  validateOrigin,
  validatePayloadSize,
} from "../src/security.js";

describe("MCP Security Middleware", () => {
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

    it("returns 200 OK for /health when valid token is supplied", async () => {
      const request = new Request("https://mcp.archlex.dev/health", {
        headers: { Authorization: "Bearer secret-123" },
      });
      const response = await worker.fetch(request, {
        MCP_AUTH_TOKEN: "secret-123",
      });
      expect(response.status).toBe(200);
      const data = (await response.json()) as { auth_enabled: boolean };
      expect(data.auth_enabled).toBe(true);
    });
  });
});
