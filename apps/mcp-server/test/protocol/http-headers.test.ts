import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  type Tool,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import {
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  MODERN_PROTOCOL_VERSION,
} from "../../src/protocol/constants.js";

function callRequest(
  headers: Record<string, string> = {},
  overrides: Record<string, unknown> = {},
): Request {
  return new Request("https://mcp.example/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": "tools/call",
      "Mcp-Name": "render_diagram",
      ...headers,
    },
    body: JSON.stringify({ ...modernCall, ...overrides }),
  });
}

const modernCall = {
  jsonrpc: "2.0",
  id: "request-1",
  method: "tools/call",
  params: {
    name: "render_diagram",
    arguments: { source: 'app: ecs["API"]' },
    _meta: {
      [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
      [CLIENT_CAPABILITIES_META_KEY]: {},
    },
  },
};

const parameterTool: Tool = {
  name: "execute_sql",
  inputSchema: {
    type: "object",
    properties: {
      region: { type: "string", "x-mcp-header": "Region" },
      retries: { type: "integer", "x-mcp-header": "Retries" },
      nested: {
        type: "object",
        properties: {
          enabled: { type: "boolean", "x-mcp-header": "Enabled" },
        },
      },
    },
  },
};

describe("MCP HTTP header encoding", () => {
  test.each([
    ["us-west1", "us-west1"],
    ["=?base64?SGVsbG8sIOS4lueVjA==?=", "Hello, 世界"],
    ["=?base64?IHBhZGRlZCA=?=", " padded "],
    ["=?base64?bGluZTEKbGluZTI=?=", "line1\nline2"],
    ["=?base64?PT9iYXNlNjQ/bGl0ZXJhbD89?=", "=?base64?literal?="],
  ])("decodes %s", async (encoded, expected) => {
    const { decodeMcpHeaderValue } = await import(
      "../../src/protocol/http-headers.js"
    );
    expect(decodeMcpHeaderValue(encoded)).toBe(expected);
  });

  test.each(["=?base64?%%%?=", "=?base64?YQ=?=", " padded ", "line\nbreak"])(
    "rejects malformed or unsafe header value %j",
    async (value) => {
      const { decodeMcpHeaderValue } = await import(
        "../../src/protocol/http-headers.js"
      );
      expect(() => decodeMcpHeaderValue(value)).toThrow(
        expect.objectContaining({ code: MCP_ERROR_CODES.HEADER_MISMATCH }),
      );
    },
  );
});

describe("standard MCP request headers", () => {
  test("accepts matching version, method, name, and media negotiation", async () => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    expect(() =>
      validateMcpHeaders(callRequest(), modernCall, []),
    ).not.toThrow();
  });

  test.each([
    ["MCP-Protocol-Version", "2025-03-26"],
    ["Mcp-Method", "TOOLS/CALL"],
    ["Mcp-Name", "other_tool"],
  ])("rejects mismatched %s", async (header, value) => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    expect(() =>
      validateMcpHeaders(callRequest({ [header]: value }), modernCall, []),
    ).toThrow(
      expect.objectContaining({
        code: MCP_ERROR_CODES.HEADER_MISMATCH,
        httpStatus: 400,
      }),
    );
  });

  test("requires Mcp-Name only for named methods", async () => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    const headers = new Headers(callRequest().headers);
    headers.delete("Mcp-Name");
    expect(() =>
      validateMcpHeaders(
        new Request("https://mcp.example/mcp", { method: "POST", headers }),
        modernCall,
        [],
      ),
    ).toThrow(
      expect.objectContaining({ code: MCP_ERROR_CODES.HEADER_MISMATCH }),
    );

    const discover = {
      ...modernCall,
      method: "server/discover",
      params: { _meta: modernCall.params._meta },
    };
    headers.set("Mcp-Method", "server/discover");
    expect(() =>
      validateMcpHeaders(
        new Request("https://mcp.example/mcp", { method: "POST", headers }),
        discover,
        [],
      ),
    ).not.toThrow();
  });

  test("requires both application/json and text/event-stream in Accept", async () => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    expect(() =>
      validateMcpHeaders(
        callRequest({ Accept: "application/json" }),
        modernCall,
        [],
      ),
    ).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.INVALID_REQUEST,
        httpStatus: 406,
      }),
    );
  });

  test("returns method-not-found before dispatching unknown modern methods", async () => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    const unknown = { ...modernCall, method: "unknown/method" };
    expect(() =>
      validateMcpHeaders(
        callRequest({ "Mcp-Method": "unknown/method" }),
        unknown,
        [],
      ),
    ).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
        httpStatus: 404,
      }),
    );
  });
});

describe("x-mcp-header", () => {
  test("validates nested primitive parameter headers against body values", async () => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    const message = {
      ...modernCall,
      params: {
        ...modernCall.params,
        name: "execute_sql",
        arguments: {
          region: "Hello, 世界",
          retries: 42,
          nested: { enabled: true },
        },
      },
    };
    const request = callRequest({
      "Mcp-Name": "execute_sql",
      "Mcp-Param-Region": "=?base64?SGVsbG8sIOS4lueVjA==?=",
      "Mcp-Param-Retries": "42.0",
      "Mcp-Param-Enabled": "true",
    });
    expect(() =>
      validateMcpHeaders(request, message, [parameterTool]),
    ).not.toThrow();
  });

  test("rejects missing or mismatched declared parameter headers", async () => {
    const { validateMcpHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    const message = {
      ...modernCall,
      params: {
        ...modernCall.params,
        name: "execute_sql",
        arguments: { region: "us-east1" },
      },
    };
    expect(() =>
      validateMcpHeaders(callRequest({ "Mcp-Name": "execute_sql" }), message, [
        parameterTool,
      ]),
    ).toThrow(
      expect.objectContaining({ code: MCP_ERROR_CODES.HEADER_MISMATCH }),
    );
  });

  test("rejects invalid x-mcp-header schema placement and types", async () => {
    const { modernCorsHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    const invalidTools: Tool[] = [
      {
        name: "root_header",
        inputSchema: {
          type: "object",
          "x-mcp-header": "Root",
        },
      },
      {
        name: "number_header",
        inputSchema: {
          type: "object",
          properties: { value: { type: "number", "x-mcp-header": "Value" } },
        },
      },
      {
        name: "composed_header",
        inputSchema: {
          type: "object",
          properties: {
            value: {
              oneOf: [{ type: "string", "x-mcp-header": "Value" }],
            },
          },
        },
      },
    ];
    for (const tool of invalidTools) {
      expect(() => modernCorsHeaders([tool])).toThrow(
        expect.objectContaining({ code: JSONRPC_ERROR_CODES.INVALID_PARAMS }),
      );
    }
  });

  test("builds CORS allow headers from standard and declared parameter headers", async () => {
    const { modernCorsHeaders } = await import(
      "../../src/protocol/http-headers.js"
    );
    expect(
      modernCorsHeaders([parameterTool])["Access-Control-Allow-Headers"],
    ).toBe(
      "Accept, Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Param-Region, Mcp-Param-Retries, Mcp-Param-Enabled",
    );
  });
});
