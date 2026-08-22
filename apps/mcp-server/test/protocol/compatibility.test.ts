import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import {
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  MODERN_PROTOCOL_VERSION,
} from "../../src/protocol/constants.js";

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
  version: string = MODERN_PROTOCOL_VERSION,
): Request {
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": version,
      "Mcp-Method": method,
      "Mcp-Session-Id": "must-be-ignored",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "modern-1",
      method,
      params: {
        ...params,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: version,
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

describe("protocol era classification", () => {
  test("selects modern only from per-request modern signals", async () => {
    const { classifyProtocolEra } = await import(
      "../../src/protocol/router.js"
    );
    expect(
      classifyProtocolEra(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        },
        new Headers(),
      ),
    ).toBe("modern");
    expect(
      classifyProtocolEra(
        { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
        new Headers(),
      ),
    ).toBe("legacy");
  });

  test("rejects non-initialize traffic without an unambiguous era", async () => {
    const { classifyProtocolEra } = await import(
      "../../src/protocol/router.js"
    );
    expect(() =>
      classifyProtocolEra(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        new Headers(),
      ),
    ).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
        httpStatus: 400,
      }),
    );
  });
});

describe("dual-era /mcp routing", () => {
  test("routes a modern request statelessly and never echoes sessions", async () => {
    const response = await worker.fetch(modernRequest("tools/list"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Mcp-Session-Id")).toBeNull();
    const body = (await response.json()) as {
      result: { resultType: string; tools: Array<{ name: string }> };
    };
    expect(body.result.resultType).toBe("complete");
    expect(body.result.tools.map((tool) => tool.name)).toEqual([
      "render_diagram",
      "validate_diagram",
      "get_cloud_catalog",
      "generate_playground_url",
    ]);
  });

  test("returns a structured modern unsupported-version error without legacy fallback", async () => {
    const response = await worker.fetch(
      modernRequest("tools/list", {}, "2099-01-01"),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: number } };
    expect(body.error.code).toBe(MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION);
  });

  test("preserves legacy initialize on POST /mcp", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "2025-03-26",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "legacy-1",
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "legacy-client", version: "1.0.0" },
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { protocolVersion: string; resultType?: string };
    };
    expect(body.result.protocolVersion).toBe("2025-03-26");
    expect(body.result.resultType).toBeUndefined();
  });

  test.each(["GET", "DELETE"])("returns 405 for %s /mcp", async (method) => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/mcp", { method }),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  test("labels HTTP+SSE endpoints as deprecated compatibility routes", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/info"),
    );
    const body = (await response.json()) as {
      modern_endpoint: string;
      deprecated_compatibility_endpoints: string[];
    };
    expect(body.modern_endpoint).toBe("/mcp");
    expect(body.deprecated_compatibility_endpoints).toEqual([
      "/sse",
      "/messages",
    ]);
  });
});
