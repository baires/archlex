import {
  inputRequired,
  isInputRequiredResult,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import {
  MCP_ERROR_CODES,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
} from "../../src/protocol/constants.js";
import type { ModernRequestContext } from "../../src/protocol/types.js";

const context: ModernRequestContext = {
  protocolVersion: MODERN_PROTOCOL_VERSION,
  clientCapabilities: { elicitation: {} },
  requestId: "request-1",
};

describe("modern result envelopes", () => {
  test("wraps complete results with server identity", async () => {
    const { completeResult } = await import("../../src/protocol/results.js");
    const result = completeResult({ tools: [] }, context);
    expect(result.resultType).toBe("complete");
    expect(result._meta[METADATA_KEYS.SERVER_INFO]).toMatchObject({
      name: "archlex-mcp-server",
    });
  });

  test("requires cache hints when an operation is marked cacheable", async () => {
    const { completeResult } = await import("../../src/protocol/results.js");
    expect(() =>
      // @ts-expect-error Cacheable calls must supply cache hints.
      completeResult({ tools: [] }, context, { cacheable: true }),
    ).toThrow(/cache hints/i);
    expect(
      completeResult({ tools: [] }, context, {
        cacheable: true,
        cache: { ttlMs: 60_000, cacheScope: "public" },
      }),
    ).toMatchObject({ ttlMs: 60_000, cacheScope: "public" });
  });

  test("builds capability-gated input-required results without cache hints", async () => {
    const { inputRequiredResult } = await import(
      "../../src/protocol/results.js"
    );
    const result = inputRequiredResult(
      {
        inputRequests: {
          confirm: inputRequired.elicit({
            message: "Confirm rendering",
            requestedSchema: {
              type: "object",
              properties: { confirmed: { type: "boolean" } },
              required: ["confirmed"],
            },
          }),
        },
        requestState: "signed-state",
      },
      context,
    );
    expect(isInputRequiredResult(result)).toBe(true);
    expect(result).not.toHaveProperty("ttlMs");
    expect(result).not.toHaveProperty("cacheScope");
  });

  test("rejects an empty MRTR payload", async () => {
    const { inputRequiredResult } = await import(
      "../../src/protocol/results.js"
    );
    expect(() => inputRequiredResult({}, context)).toThrow(/inputRequests/i);
  });

  test("rejects input requests without their matching client capability", async () => {
    const { inputRequiredResult } = await import(
      "../../src/protocol/results.js"
    );
    expect(() =>
      inputRequiredResult(
        { inputRequests: { roots: inputRequired.listRoots() } },
        context,
      ),
    ).toThrow(
      expect.objectContaining({
        code: MCP_ERROR_CODES.MISSING_REQUIRED_CLIENT_CAPABILITY,
        httpStatus: 400,
      }),
    );
  });

  test("correlates retry responses and rejects unknown, duplicate, and wrong-kind entries", async () => {
    const { validateInputResponses } = await import(
      "../../src/protocol/results.js"
    );
    const requests = { roots: inputRequired.listRoots() };
    expect(() =>
      validateInputResponses(requests, { unexpected: { roots: [] } }),
    ).toThrow(expect.objectContaining({ code: -32602 }));
    expect(() =>
      validateInputResponses(requests, [
        ["roots", { roots: [] }],
        ["roots", { roots: [] }],
      ]),
    ).toThrow(expect.objectContaining({ code: -32602 }));
    expect(() =>
      validateInputResponses(requests, { roots: { action: "accept" } }),
    ).toThrow(expect.objectContaining({ code: -32602 }));
    expect(validateInputResponses(requests, { roots: { roots: [] } })).toEqual({
      roots: { roots: [] },
    });
  });
});

describe("modern protocol errors", () => {
  test("defines every JSON-RPC and MCP Phase 0 error code", async () => {
    const { JSONRPC_ERROR_CODES } = await import(
      "../../src/protocol/constants.js"
    );
    expect(Object.values(JSONRPC_ERROR_CODES)).toEqual([
      -32700, -32600, -32601, -32602, -32603,
    ]);
    expect(Object.values(MCP_ERROR_CODES)).toEqual([-32020, -32021, -32022]);
  });

  test("maps malformed requests to 400, unknown methods to 404, and internal errors to 500", async () => {
    const { protocolHttpStatus } = await import("../../src/protocol/errors.js");
    expect(protocolHttpStatus(-32602)).toBe(400);
    expect(protocolHttpStatus(MCP_ERROR_CODES.HEADER_MISMATCH)).toBe(400);
    expect(
      protocolHttpStatus(MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION),
    ).toBe(400);
    expect(protocolHttpStatus(-32601)).toBe(404);
    expect(protocolHttpStatus(-32603)).toBe(500);
  });

  test("maps structured errors to JSON-RPC and HTTP", async () => {
    const { McpProtocolError, toHttpErrorResponse } = await import(
      "../../src/protocol/errors.js"
    );
    const response = toHttpErrorResponse(
      new McpProtocolError(-32601, "Unknown method", 404, { method: "nope" }),
      "request-1",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: "request-1",
      error: {
        code: -32601,
        message: "Unknown method",
        data: { method: "nope" },
      },
    });
  });

  test("accepts notifications with 202 and no response body", async () => {
    const { acceptedNotificationResponse } = await import(
      "../../src/protocol/errors.js"
    );
    const response = acceptedNotificationResponse();
    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
  });
});
