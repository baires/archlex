import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../../src/index.js";
import { MODERN_PROTOCOL_VERSION } from "../../src/protocol/constants.js";
import { inMemoryRateLimiter } from "../../src/security.js";

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
  options: {
    id?: string | number | null;
    isNotification?: boolean;
    nameHeader?: string;
    protocolVersion?: string;
    clientCapabilities?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {},
): Request {
  const version = options.protocolVersion ?? MODERN_PROTOCOL_VERSION;
  const clientCapabilities = options.clientCapabilities ?? {};
  const body: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
    params: {
      ...params,
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: version,
        [CLIENT_CAPABILITIES_META_KEY]: clientCapabilities,
        ...(params._meta as Record<string, unknown> | undefined),
      },
    },
  };

  if (!options.isNotification) {
    body.id = options.id === undefined ? "transport-req-1" : options.id;
  }

  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": version,
    "Mcp-Method": method,
    ...options.headers,
  };

  if (options.nameHeader) {
    headers["Mcp-Name"] = options.nameHeader;
  }

  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("MCP Streamable HTTP Transport Conformance", () => {
  beforeEach(() => {
    inMemoryRateLimiter.reset();
  });

  describe("Response Formats (JSON and SSE Streams)", () => {
    it("delivers standard JSON response for non-streaming requests", async () => {
      const req = modernRequest("server/discover");
      const res = await worker.fetch(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/json");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Mcp-Session-Id")).toBeNull();

      const data = (await res.json()) as {
        jsonrpc: string;
        id: string;
        result: { resultType: string };
      };
      expect(data.jsonrpc).toBe("2.0");
      expect(data.id).toBe("transport-req-1");
      expect(data.result.resultType).toBe("complete");
    });

    it("streams request-scoped SSE progress events and final response for render_diagram with progressToken", async () => {
      const req = modernRequest(
        "tools/call",
        {
          name: "render_diagram",
          arguments: { source: "provider aws\necs" },
          _meta: { progressToken: "render-prog-1" },
        },
        { nameHeader: "render_diagram" },
      );

      const res = await worker.fetch(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/event-stream");
      expect(res.headers.get("X-Accel-Buffering")).toBe("no");

      const raw = await res.text();
      const events = raw
        .split("\n\n")
        .filter(Boolean)
        .map((block) => {
          const line = block.split("\n").find((l) => l.startsWith("data: "));
          return line ? JSON.parse(line.slice(6)) : null;
        })
        .filter(Boolean);

      expect(events.length).toBeGreaterThanOrEqual(2);

      // Progress notification events
      const progressEvents = events.filter(
        (e) => e.method === "notifications/progress",
      );
      expect(progressEvents.length).toBeGreaterThanOrEqual(1);
      for (const pe of progressEvents) {
        expect(pe.params.progressToken).toBe("render-prog-1");
        expect(typeof pe.params.progress).toBe("number");
      }

      // Final tool result
      const finalResult = events[events.length - 1];
      expect(finalResult.id).toBe("transport-req-1");
      expect(finalResult.result.resultType).toBe("complete");
    });

    it("streams request-scoped SSE subscription acknowledgment and keep-alives", async () => {
      const controller = new AbortController();
      const req = new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
          "Mcp-Method": "subscriptions/listen",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "sub-listen-1",
          method: "subscriptions/listen",
          params: {
            notifications: {
              toolsListChanged: true,
            },
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        }),
        signal: controller.signal,
      });

      const res = await worker.fetch(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/event-stream");
      expect(res.headers.get("X-Accel-Buffering")).toBe("no");

      const reader = res.body?.getReader();
      expect(reader).toBeDefined();
      if (!reader) return;

      const decoder = new TextDecoder();
      const chunk = await reader.read();
      const text = decoder.decode(chunk.value);

      expect(text).toContain("notifications/subscriptions/acknowledged");
      expect(text).toContain("sub-listen-1");

      controller.abort();
      await reader.cancel();
    });

    it("returns HTTP 202 with empty body for modern client notification POST", async () => {
      const req = modernRequest(
        "notifications/cancelled",
        { requestId: "prev-req" },
        { isNotification: true },
      );

      const res = await worker.fetch(req);
      expect(res.status).toBe(202);
      const text = await res.text();
      expect(text).toBe("");
    });
  });

  describe("HTTP Method Restrictions on /mcp", () => {
    it.each(["GET", "DELETE", "PUT", "PATCH"])(
      "rejects %s /mcp with 405 Method Not Allowed",
      async (method) => {
        const req = new Request("https://mcp.archlex.dev/mcp", {
          method,
          headers: {
            "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
          },
        });
        const res = await worker.fetch(req);
        expect(res.status).toBe(405);
        if (method === "GET" || method === "DELETE") {
          expect(res.headers.get("Allow")).toContain("POST, OPTIONS");
        }
      },
    );

    it("handles OPTIONS /mcp CORS preflight with modern headers allowed", async () => {
      const req = new Request("https://mcp.archlex.dev/mcp", {
        method: "OPTIONS",
        headers: {
          Origin: "https://archlex.dev",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "MCP-Protocol-Version, Mcp-Method, Mcp-Name",
        },
      });

      const res = await worker.fetch(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      const allowHeaders = res.headers.get("Access-Control-Allow-Headers");
      expect(allowHeaders).toContain("MCP-Protocol-Version");
      expect(allowHeaders).toContain("Mcp-Method");
      expect(allowHeaders).toContain("Mcp-Name");
    });
  });

  describe("Security Middleware on /mcp", () => {
    it("rejects unauthorized origin when ALLOWED_ORIGINS is configured", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          headers: { Origin: "https://unauthorized-origin.com" },
        },
      );
      const env = {
        ALLOWED_ORIGINS: "https://archlex.dev, https://playground.archlex.dev",
      };

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain("Forbidden origin");
    });

    it("accepts authorized origin when ALLOWED_ORIGINS is configured", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          headers: { Origin: "https://playground.archlex.dev" },
        },
      );
      const env = {
        ALLOWED_ORIGINS: "https://archlex.dev, https://playground.archlex.dev",
      };

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://playground.archlex.dev",
      );
    });

    it("rejects unauthenticated requests when MCP_AUTH_TOKEN is configured", async () => {
      const req = modernRequest("server/discover");
      const env = { MCP_AUTH_TOKEN: "secure-secret-token" };

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it("accepts requests with valid Bearer token in Authorization header", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          headers: { Authorization: "Bearer secure-secret-token" },
        },
      );
      const env = { MCP_AUTH_TOKEN: "secure-secret-token" };

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it("accepts requests with valid ?token= query parameter", async () => {
      const baseReq = modernRequest("server/discover");
      const url = new URL(baseReq.url);
      url.searchParams.set("token", "secure-secret-token");

      const req = new Request(url.toString(), {
        method: "POST",
        headers: baseReq.headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
          params: {
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        }),
      });
      const env = { MCP_AUTH_TOKEN: "secure-secret-token" };

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it("rejects payloads exceeding 512 KB with 413 Payload Too Large", async () => {
      const req = new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "Content-Length": "600000",
          "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
          "Mcp-Method": "server/discover",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
        }),
      });

      const res = await worker.fetch(req);
      expect(res.status).toBe(413);
    });

    it("enforces rate limits on /mcp", async () => {
      const env = {
        RATE_LIMIT_MAX_REQUESTS: "3",
        RATE_LIMIT_WINDOW_SECONDS: "60",
      };

      const ipHeader = { "cf-connecting-ip": "198.51.100.42" };

      const req1 = modernRequest("server/discover", {}, { headers: ipHeader });
      const req2 = modernRequest("server/discover", {}, { headers: ipHeader });
      const req3 = modernRequest("server/discover", {}, { headers: ipHeader });
      const req4 = modernRequest("server/discover", {}, { headers: ipHeader });

      expect((await worker.fetch(req1, env)).status).toBe(200);
      expect((await worker.fetch(req2, env)).status).toBe(200);
      expect((await worker.fetch(req3, env)).status).toBe(200);

      const res4 = await worker.fetch(req4, env);
      expect(res4.status).toBe(429);
      expect(res4.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("Dual-Era & Legacy Compatibility Isolation", () => {
    it("handles legacy initialize on POST /mcp via SDK v1", async () => {
      const req = new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "2025-03-26",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "legacy-client", version: "1.0.0" },
          },
        }),
      });

      const res = await worker.fetch(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        result: { protocolVersion: string; serverInfo: { name: string } };
      };
      expect(data.result.protocolVersion).toBe("2025-03-26");
      expect(data.result.serverInfo.name).toBe("archlex-mcp-server");
    });

    it("serves legacy GET /sse and POST /messages without polluting modern /mcp", async () => {
      // 1. Initialize legacy SSE
      const sseReq = new Request("https://mcp.archlex.dev/sse");
      const sseRes = await worker.fetch(sseReq);
      expect(sseRes.status).toBe(200);
      expect(sseRes.headers.get("Content-Type")).toContain("text/event-stream");

      const reader = sseRes.body?.getReader();
      expect(reader).toBeDefined();
      if (!reader) return;

      const decoder = new TextDecoder();
      const chunk = await reader.read();
      const text = decoder.decode(chunk.value);
      expect(text).toContain("event: endpoint");
      expect(text).toContain("/messages?sessionId=");

      const sessionId = text.match(/sessionId=([a-zA-Z0-9-]+)/)?.[1];
      expect(sessionId).toBeDefined();

      // 2. Send message to legacy /messages with sessionId
      const msgReq = new Request(
        `https://mcp.archlex.dev/messages?sessionId=${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 50,
            method: "tools/list",
          }),
        },
      );
      const msgRes = await worker.fetch(msgReq);
      expect(msgRes.status).toBe(202);

      // Clean up legacy SSE stream
      await reader.cancel();

      // 3. Verify modern /mcp remains completely stateless and unpolluted
      const modernReq = modernRequest("tools/list");
      const modernRes = await worker.fetch(modernReq);
      expect(modernRes.status).toBe(200);
      expect(modernRes.headers.get("Mcp-Session-Id")).toBeNull();
    });
  });
});
