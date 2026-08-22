import {
  DiscoverResultSchema,
  JSONRPCRequestSchema,
  SubscriptionFilterSchema,
} from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  LATEST_PROTOCOL_VERSION,
  PROTOCOL_VERSION_META_KEY,
  isInputRequiredResult,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import packageJson from "../../package.json";
import {
  MCP_ERROR_CODES,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "../../src/protocol/constants.js";
import {
  INVALID_NULL_REQUEST_ID,
  INVALID_OBJECT_RESOURCE_SUBSCRIPTION,
  VALID_DISCOVER_RESULT,
  VALID_INPUT_REQUIRED_RESULT,
  VALID_MODERN_META_FULL,
  VALID_SUBSCRIPTION_FILTER,
} from "../fixtures/mcp-2026.js";

describe("MCP 2026-07-28 official contract", () => {
  test("pins the tested SDK generations at the package boundary", () => {
    expect(packageJson.dependencies["@modelcontextprotocol/core"]).toBe(
      "2.0.0",
    );
    expect(packageJson.dependencies["@modelcontextprotocol/server"]).toBe(
      "2.0.0",
    );
    expect(packageJson.dependencies["@modelcontextprotocol/sdk"]).toBe(
      "1.30.0",
    );
  });

  test("keeps the modern opt-in separate from the v2 legacy default", () => {
    expect(MODERN_PROTOCOL_VERSION).toBe("2026-07-28");
    expect(SUPPORTED_PROTOCOL_VERSIONS[0]).toBe(MODERN_PROTOCOL_VERSION);
    expect(LATEST_PROTOCOL_VERSION).toBe("2025-11-25");
  });

  test("uses the official reserved request metadata keys", () => {
    expect(METADATA_KEYS.PROTOCOL_VERSION).toBe(PROTOCOL_VERSION_META_KEY);
    expect(METADATA_KEYS.CLIENT_CAPABILITIES).toBe(
      CLIENT_CAPABILITIES_META_KEY,
    );
    expect(METADATA_KEYS.CLIENT_INFO).toBe(CLIENT_INFO_META_KEY);
    expect(VALID_MODERN_META_FULL).toHaveProperty(CLIENT_INFO_META_KEY);
    expect(VALID_MODERN_META_FULL).not.toHaveProperty("clientInfo");
  });

  test("builds MRTR results recognized by SDK v2", () => {
    expect(isInputRequiredResult(VALID_INPUT_REQUIRED_RESULT)).toBe(true);
    expect(Array.isArray(VALID_INPUT_REQUIRED_RESULT.inputRequests)).toBe(
      false,
    );
    expect(typeof VALID_INPUT_REQUIRED_RESULT.requestState).toBe("string");
  });

  test("validates discovery with the official schema", () => {
    const parsed = DiscoverResultSchema.parse(VALID_DISCOVER_RESULT);
    expect(parsed.supportedVersions).toEqual([MODERN_PROTOCOL_VERSION]);
    expect(parsed.capabilities.resources).toEqual({
      listChanged: false,
      subscribe: false,
    });
  });

  test("validates subscription filters with string resource URIs", () => {
    expect(SubscriptionFilterSchema.parse(VALID_SUBSCRIPTION_FILTER)).toEqual(
      VALID_SUBSCRIPTION_FILTER,
    );
    expect(
      SubscriptionFilterSchema.safeParse(INVALID_OBJECT_RESOURCE_SUBSCRIPTION)
        .success,
    ).toBe(false);
  });

  test("rejects null JSON-RPC request IDs", () => {
    expect(
      JSONRPCRequestSchema.safeParse(INVALID_NULL_REQUEST_ID).success,
    ).toBe(false);
  });

  test("uses final MCP error-code names and values", () => {
    expect(MCP_ERROR_CODES.HEADER_MISMATCH).toBe(-32020);
    expect(MCP_ERROR_CODES.MISSING_REQUIRED_CLIENT_CAPABILITY).toBe(-32021);
    expect(MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION).toBe(-32022);
  });
});
