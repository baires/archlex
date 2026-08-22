import { DiscoverResultSchema } from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import {
  JSONRPC_ERROR_CODES,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "../../src/protocol/constants.js";
import type { ModernRequestContext } from "../../src/protocol/types.js";

const context: ModernRequestContext = {
  protocolVersion: MODERN_PROTOCOL_VERSION,
  clientCapabilities: {},
  requestId: "discover-1",
};

function discoverRequest(extraParams: Record<string, unknown> = {}): Request {
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": "server/discover",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "discover-1",
      method: "server/discover",
      params: {
        ...extraParams,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

describe("server/discover", () => {
  test("returns an official schema-valid, cacheable complete result", async () => {
    const { discover } = await import("../../src/protocol/discovery.js");
    const result = discover(context);
    expect(DiscoverResultSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({
      resultType: "complete",
      supportedVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      ttlMs: 3_600_000,
      cacheScope: "public",
    });
    expect(result._meta[METADATA_KEYS.SERVER_INFO]).toMatchObject({
      name: "archlex-mcp-server",
    });
    expect(result.instructions).toContain("Use render_diagram directly");
    expect(result).not.toHaveProperty("protocolVersion");
    expect(result.capabilities).toEqual({
      tools: {},
      resources: {},
      prompts: {},
    });
  });

  test("derives advertised capabilities from the shared registry", async () => {
    const { discover } = await import("../../src/protocol/discovery.js");
    const { registryCapabilities } = await import("../../src/registry.js");
    expect(discover(context).capabilities).toEqual(registryCapabilities());
  });

  test("serves discovery through the modern HTTP route", async () => {
    const response = await worker.fetch(discoverRequest());
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      id: string;
      result: { resultType: string; supportedVersions: string[] };
    };
    expect(body.id).toBe("discover-1");
    expect(body.result.resultType).toBe("complete");
    expect(body.result.supportedVersions).toEqual([MODERN_PROTOCOL_VERSION]);
  });

  test("rejects method-specific discovery parameters", async () => {
    const response = await worker.fetch(discoverRequest({ verbose: true }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: number } };
    expect(body.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
  });
});
