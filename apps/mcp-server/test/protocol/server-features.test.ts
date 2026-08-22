import {
  CallToolResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  type Tool,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import {
  JSONRPC_ERROR_CODES,
  MODERN_PROTOCOL_VERSION,
} from "../../src/protocol/constants.js";
import { validateToolResult } from "../../src/protocol/validation.js";

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
): Request {
  const named =
    method === "tools/call" || method === "prompts/get"
      ? params.name
      : method === "resources/read"
        ? params.uri
        : undefined;
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": method,
      ...(typeof named === "string" ? { "Mcp-Name": named } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `feature-${method}`,
      method,
      params: {
        ...params,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

describe("official server feature result shapes", () => {
  test.each([
    ["tools/list", {}, ListToolsResultSchema],
    [
      "tools/call",
      { name: "generate_playground_url", arguments: { source: "a: s3" } },
      CallToolResultSchema,
    ],
    ["resources/list", {}, ListResourcesResultSchema],
    [
      "resources/read",
      { uri: "archlex://docs/dsl-syntax" },
      ReadResourceResultSchema,
    ],
    ["prompts/list", {}, ListPromptsResultSchema],
    [
      "prompts/get",
      {
        name: "architect_cloud_infrastructure",
        arguments: { provider: "aws", requirements: "A web service" },
      },
      GetPromptResultSchema,
    ],
  ])(
    "returns a schema-valid complete result for %s",
    async (method, params, schema) => {
      const response = await worker.fetch(modernRequest(method, params));
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        result: Record<string, unknown>;
      };
      expect(schema.safeParse(body.result).success).toBe(true);
      expect(body.result).toMatchObject({
        resultType: "complete",
        _meta: {
          "io.modelcontextprotocol/serverInfo": {
            name: "archlex-mcp-server",
          },
        },
      });
    },
  );
});

describe("feature request validation", () => {
  test.each([
    [
      "resources/read",
      { uri: "archlex://missing/resource" },
      { uri: "archlex://missing/resource" },
    ],
    [
      "prompts/get",
      { name: "missing_prompt", arguments: {} },
      { name: "missing_prompt" },
    ],
  ])(
    "returns identifying invalid-params data for missing %s targets",
    async (method, params, data) => {
      const response = await worker.fetch(modernRequest(method, params));
      expect(response.status).toBe(400);
      const body = (await response.json()) as {
        error: { code: number; data: unknown };
      };
      expect(body.error).toMatchObject({
        code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
        data,
      });
    },
  );

  test.each([
    ["resources/read", { uri: "not a valid URI" }],
    ["tools/call", { name: "render_diagram", arguments: {} }],
    [
      "prompts/get",
      {
        name: "architect_cloud_infrastructure",
        arguments: { provider: "aws" },
      },
    ],
  ])(
    "rejects invalid %s parameters before domain execution",
    async (method, params) => {
      const response = await worker.fetch(modernRequest(method, params));
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { code: number } };
      expect(body.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
    },
  );

  test("validates structuredContent against a declared output schema", () => {
    const tool: Tool = {
      name: "count_nodes",
      inputSchema: { type: "object" },
      outputSchema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: { count: { type: "integer" } },
        required: ["count"],
      },
    };
    expect(() =>
      validateToolResult(tool, {
        content: [],
        structuredContent: { count: 2 },
      }),
    ).not.toThrow();
    expect(() =>
      validateToolResult(tool, {
        content: [],
        structuredContent: { count: "two" },
      }),
    ).toThrow(
      expect.objectContaining({ code: JSONRPC_ERROR_CODES.INTERNAL_ERROR }),
    );
  });
});
