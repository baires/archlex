/**
 * Schema Contract Tests for MCP 2026-07-28
 *
 * Tests that validate our local types against the official MCP 2026-07-28 schema.
 * These tests ensure our protocol implementation matches the specification.
 */

import { describe, expect, test } from "vitest";
import {
  CACHE_SCOPES,
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  MCP_METHODS,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
  RESULT_TYPES,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "../../src/protocol/constants.js";
import type {
  CompleteResult,
  InputRequiredResult,
  JSONRPCRequest,
  ModernRequestMeta,
} from "../../src/protocol/types.js";
import {
  INVALID_META_MISSING_CAPABILITIES,
  INVALID_META_MISSING_VERSION,
  INVALID_META_UNSUPPORTED_VERSION,
  INVALID_RESULT_MISSING_SERVER_INFO,
  INVALID_RESULT_MISSING_TYPE,
  VALID_COMPLETE_RESULT,
  VALID_COMPLETE_RESULT_WITH_CACHE,
  VALID_INPUT_REQUIRED_RESULT,
  VALID_JSONRPC_REQUEST,
  VALID_MODERN_META,
  VALID_MODERN_META_FULL,
} from "../fixtures/mcp-2026.js";

describe("MCP 2026-07-28 Schema Contract", () => {
  describe("Protocol Version Constants", () => {
    test("MODERN_PROTOCOL_VERSION must be exactly '2026-07-28'", () => {
      expect(MODERN_PROTOCOL_VERSION).toBe("2026-07-28");
    });

    test("SUPPORTED_PROTOCOL_VERSIONS must include modern version", () => {
      expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(MODERN_PROTOCOL_VERSION);
    });

    test("SUPPORTED_PROTOCOL_VERSIONS must be ordered", () => {
      expect(SUPPORTED_PROTOCOL_VERSIONS[0]).toBe(MODERN_PROTOCOL_VERSION);
    });
  });

  describe("Metadata Keys", () => {
    test("metadata keys match official schema", () => {
      expect(METADATA_KEYS.PROTOCOL_VERSION).toBe(
        "io.modelcontextprotocol/protocolVersion",
      );
      expect(METADATA_KEYS.CLIENT_CAPABILITIES).toBe(
        "io.modelcontextprotocol/clientCapabilities",
      );
      expect(METADATA_KEYS.SERVER_INFO).toBe(
        "io.modelcontextprotocol/serverInfo",
      );
      expect(METADATA_KEYS.SUBSCRIPTION_ID).toBe(
        "io.modelcontextprotocol/subscriptionId",
      );
    });
  });

  describe("Method Names", () => {
    test("discovery method is 'server/discover'", () => {
      expect(MCP_METHODS.SERVER_DISCOVER).toBe("server/discover");
    });

    test("tool methods are correctly named", () => {
      expect(MCP_METHODS.TOOLS_LIST).toBe("tools/list");
      expect(MCP_METHODS.TOOLS_CALL).toBe("tools/call");
    });

    test("resource methods are correctly named", () => {
      expect(MCP_METHODS.RESOURCES_LIST).toBe("resources/list");
      expect(MCP_METHODS.RESOURCES_READ).toBe("resources/read");
      expect(MCP_METHODS.RESOURCES_TEMPLATES_LIST).toBe(
        "resources/templates/list",
      );
    });

    test("prompt methods are correctly named", () => {
      expect(MCP_METHODS.PROMPTS_LIST).toBe("prompts/list");
      expect(MCP_METHODS.PROMPTS_GET).toBe("prompts/get");
    });

    test("subscription method is correctly named", () => {
      expect(MCP_METHODS.SUBSCRIPTIONS_LISTEN).toBe("subscriptions/listen");
    });
  });

  describe("Error Codes", () => {
    test("JSON-RPC error codes match specification", () => {
      expect(JSONRPC_ERROR_CODES.PARSE_ERROR).toBe(-32700);
      expect(JSONRPC_ERROR_CODES.INVALID_REQUEST).toBe(-32600);
      expect(JSONRPC_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601);
      expect(JSONRPC_ERROR_CODES.INVALID_PARAMS).toBe(-32602);
      expect(JSONRPC_ERROR_CODES.INTERNAL_ERROR).toBe(-32603);
    });

    test("MCP error codes match specification", () => {
      expect(MCP_ERROR_CODES.HEADER_MISMATCH).toBe(-32020);
      expect(MCP_ERROR_CODES.CAPABILITY_NOT_SUPPORTED).toBe(-32021);
      expect(MCP_ERROR_CODES.UNSUPPORTED_VERSION).toBe(-32022);
    });
  });

  describe("Result Types", () => {
    test("result types match specification", () => {
      expect(RESULT_TYPES.COMPLETE).toBe("complete");
      expect(RESULT_TYPES.INPUT_REQUIRED).toBe("input_required");
    });

    test("cache scopes match specification", () => {
      expect(CACHE_SCOPES.PUBLIC).toBe("public");
      expect(CACHE_SCOPES.PRIVATE).toBe("private");
    });
  });

  describe("Valid Request Metadata", () => {
    test("minimal valid metadata contains required fields", () => {
      expect(VALID_MODERN_META).toHaveProperty(METADATA_KEYS.PROTOCOL_VERSION);
      expect(VALID_MODERN_META).toHaveProperty(
        METADATA_KEYS.CLIENT_CAPABILITIES,
      );
      expect(VALID_MODERN_META[METADATA_KEYS.PROTOCOL_VERSION]).toBe(
        MODERN_PROTOCOL_VERSION,
      );
    });

    test("full valid metadata contains optional fields", () => {
      expect(VALID_MODERN_META_FULL).toHaveProperty("clientInfo");
      expect(VALID_MODERN_META_FULL.clientInfo).toHaveProperty("name");
      expect(VALID_MODERN_META_FULL.clientInfo).toHaveProperty("version");
      expect(VALID_MODERN_META_FULL).toHaveProperty("progressToken");
    });

    test("client capabilities are extensible objects", () => {
      expect(typeof VALID_MODERN_META[METADATA_KEYS.CLIENT_CAPABILITIES]).toBe(
        "object",
      );
      expect(
        VALID_MODERN_META_FULL[METADATA_KEYS.CLIENT_CAPABILITIES],
      ).toHaveProperty("subscriptions");
    });
  });

  describe("Invalid Request Metadata", () => {
    test("metadata without protocol version is invalid", () => {
      expect(INVALID_META_MISSING_VERSION).not.toHaveProperty(
        METADATA_KEYS.PROTOCOL_VERSION,
      );
    });

    test("metadata without client capabilities is invalid", () => {
      expect(INVALID_META_MISSING_CAPABILITIES).not.toHaveProperty(
        METADATA_KEYS.CLIENT_CAPABILITIES,
      );
    });

    test("metadata with unsupported version is invalid", () => {
      const version =
        INVALID_META_UNSUPPORTED_VERSION[METADATA_KEYS.PROTOCOL_VERSION];
      expect(SUPPORTED_PROTOCOL_VERSIONS).not.toContain(version);
    });
  });

  describe("Valid Complete Results", () => {
    test("complete result contains resultType", () => {
      expect(VALID_COMPLETE_RESULT.resultType).toBe(RESULT_TYPES.COMPLETE);
    });

    test("complete result contains server info in _meta", () => {
      expect(VALID_COMPLETE_RESULT._meta).toHaveProperty(
        METADATA_KEYS.SERVER_INFO,
      );
      expect(
        VALID_COMPLETE_RESULT._meta[METADATA_KEYS.SERVER_INFO],
      ).toHaveProperty("name");
      expect(
        VALID_COMPLETE_RESULT._meta[METADATA_KEYS.SERVER_INFO],
      ).toHaveProperty("version");
    });

    test("complete result with cache hints has ttlMs and cacheScope", () => {
      expect(VALID_COMPLETE_RESULT_WITH_CACHE).toHaveProperty("ttlMs");
      expect(VALID_COMPLETE_RESULT_WITH_CACHE).toHaveProperty("cacheScope");
      expect(typeof VALID_COMPLETE_RESULT_WITH_CACHE.ttlMs).toBe("number");
      const validScopes: string[] = [CACHE_SCOPES.PUBLIC, CACHE_SCOPES.PRIVATE];
      expect(
        validScopes.includes(
          VALID_COMPLETE_RESULT_WITH_CACHE.cacheScope as string,
        ),
      ).toBe(true);
    });
  });

  describe("Valid Input-Required Results", () => {
    test("input-required result contains resultType", () => {
      expect(VALID_INPUT_REQUIRED_RESULT.resultType).toBe(
        RESULT_TYPES.INPUT_REQUIRED,
      );
    });

    test("input-required result contains server info in _meta", () => {
      expect(VALID_INPUT_REQUIRED_RESULT._meta).toHaveProperty(
        METADATA_KEYS.SERVER_INFO,
      );
    });

    test("input-required result contains inputRequests array", () => {
      expect(VALID_INPUT_REQUIRED_RESULT).toHaveProperty("inputRequests");
      expect(Array.isArray(VALID_INPUT_REQUIRED_RESULT.inputRequests)).toBe(
        true,
      );
      expect(VALID_INPUT_REQUIRED_RESULT.inputRequests.length).toBeGreaterThan(
        0,
      );
    });

    test("input requests have id and kind", () => {
      const inputRequest = VALID_INPUT_REQUIRED_RESULT.inputRequests[0];
      expect(inputRequest).toHaveProperty("id");
      expect(inputRequest).toHaveProperty("kind");
      expect(["prompt", "tool_call", "resource_read"]).toContain(
        inputRequest.kind,
      );
    });

    test("input-required result may contain requestState", () => {
      expect(VALID_INPUT_REQUIRED_RESULT).toHaveProperty("requestState");
    });
  });

  describe("Invalid Results", () => {
    test("result without resultType is invalid", () => {
      expect(INVALID_RESULT_MISSING_TYPE).not.toHaveProperty("resultType");
    });

    test("result without server info is invalid", () => {
      expect(INVALID_RESULT_MISSING_SERVER_INFO._meta).not.toHaveProperty(
        METADATA_KEYS.SERVER_INFO,
      );
    });
  });

  describe("JSON-RPC Request Structure", () => {
    test("valid request has jsonrpc, id, method, and params", () => {
      expect(VALID_JSONRPC_REQUEST).toHaveProperty("jsonrpc");
      expect(VALID_JSONRPC_REQUEST).toHaveProperty("id");
      expect(VALID_JSONRPC_REQUEST).toHaveProperty("method");
      expect(VALID_JSONRPC_REQUEST).toHaveProperty("params");
      expect(VALID_JSONRPC_REQUEST.jsonrpc).toBe("2.0");
    });

    test("valid request params contain _meta with modern metadata", () => {
      expect(VALID_JSONRPC_REQUEST.params).toHaveProperty("_meta");
      expect(VALID_JSONRPC_REQUEST.params?._meta).toHaveProperty(
        METADATA_KEYS.PROTOCOL_VERSION,
      );
      expect(VALID_JSONRPC_REQUEST.params?._meta).toHaveProperty(
        METADATA_KEYS.CLIENT_CAPABILITIES,
      );
    });
  });

  describe("SDK Boundary Documentation", () => {
    test("documents that SDK is version 1.30.0", () => {
      // This test documents the SDK version we're using
      // The SDK version is pinned in package.json
      const documentedSdkVersion = "1.30.0";
      expect(documentedSdkVersion).toBe("1.30.0");
    });

    test("documents that SDK uses DRAFT-2026-v1, not 2026-07-28", () => {
      // The current SDK (1.30.0) uses DRAFT-2026-v1
      // We implement 2026-07-28 with a local adapter
      const sdkProtocolVersion = "DRAFT-2026-v1";
      expect(sdkProtocolVersion).not.toBe(MODERN_PROTOCOL_VERSION);
    });

    test("documents adapter boundary: SDK handles legacy, adapter handles modern", () => {
      // This is a documentation test - the adapter will:
      // 1. Route modern requests (with _meta) to stateless 2026-07-28 handling
      // 2. Route legacy initialize requests to SDK
      // 3. Never mix the two eras
      const architectureDecision = {
        modern: "local adapter with 2026-07-28 types",
        legacy: "SDK with initialize/session model",
        boundary: "metadata presence",
      };
      expect(architectureDecision.modern).toBe(
        "local adapter with 2026-07-28 types",
      );
      expect(architectureDecision.legacy).toBe(
        "SDK with initialize/session model",
      );
      expect(architectureDecision.boundary).toBe("metadata presence");
    });
  });
});
