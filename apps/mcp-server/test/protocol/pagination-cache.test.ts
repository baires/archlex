import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import {
  JSONRPC_ERROR_CODES,
  MODERN_PROTOCOL_VERSION,
} from "../../src/protocol/constants.js";
import { paginate } from "../../src/protocol/pagination.js";
import { completeResult } from "../../src/protocol/results.js";
import type { ModernRequestContext } from "../../src/protocol/types.js";
import { listPrompts, listResources, listTools } from "../../src/registry.js";

const context: ModernRequestContext = {
  protocolVersion: MODERN_PROTOCOL_VERSION,
  clientCapabilities: {},
  requestId: "pagination-1",
};

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
): Request {
  const namedValue =
    method === "resources/read" ? String(params.uri) : undefined;
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": method,
      ...(namedValue ? { "Mcp-Name": namedValue } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `pagination-${method}`,
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

describe("stable opaque pagination", () => {
  const collections: ReadonlyArray<readonly [string, readonly unknown[]]> = [
    ["tools", listTools({ enableMcpApps: false })],
    ["resources", listResources()],
    ["prompts", listPrompts()],
  ];

  test.each(collections)(
    "covers first, middle, and final %s pages without reordering",
    (_name, items) => {
      const first = paginate(items, undefined, 2);
      expect(first.items).toEqual(items.slice(0, 2));

      if (items.length > 2) {
        expect(first.nextCursor).toEqual(expect.any(String));
        const middle = paginate(items, first.nextCursor, 2);
        expect(middle.items).toEqual(items.slice(2, 4));

        let page = middle;
        const collected = [...first.items, ...middle.items];
        while (page.nextCursor) {
          page = paginate(items, page.nextCursor, 2);
          collected.push(...page.items);
        }
        expect(page.nextCursor).toBeUndefined();
        expect(collected).toEqual(items);
      } else {
        expect(first.nextCursor).toBeUndefined();
      }
    },
  );

  test("rejects malformed and cross-collection cursors as invalid params", () => {
    const tools = listTools({ enableMcpApps: false });
    const resources = listResources();
    const cursor = paginate(tools, undefined, 2).nextCursor;
    expect(cursor).toEqual(expect.any(String));

    expect(() => paginate(tools, "not-a-cursor", 2)).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
        httpStatus: 400,
      }),
    );
    expect(() => paginate(resources, cursor, 2)).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
        httpStatus: 400,
      }),
    );
  });
});

describe("cacheable modern results", () => {
  test.each([
    ["server/discover", {}],
    ["tools/list", {}],
    ["resources/list", {}],
    ["prompts/list", {}],
    ["resources/read", { uri: "archlex://docs/dsl-syntax" }],
  ])("returns required public cache hints for %s", async (method, params) => {
    const response = await worker.fetch(modernRequest(method, params));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { ttlMs?: number; cacheScope?: string };
    };
    expect(body.result.ttlMs).toEqual(expect.any(Number));
    expect(body.result.ttlMs).toBeGreaterThanOrEqual(0);
    expect(body.result.cacheScope).toBe("public");
  });

  test.each([{ inputResponses: {} }, { requestState: "retry-state" }])(
    "refuses to cache retry material %#",
    (payload) => {
      expect(() =>
        completeResult(payload, context, {
          cacheable: true,
          cache: { ttlMs: 1_000, cacheScope: "private" },
        }),
      ).toThrow(TypeError);
    },
  );
});
