/**
 * Test fixtures for MCP 2026-07-28 protocol
 *
 * Valid and invalid fixtures for testing modern MCP requests and responses.
 */

import {
  CACHE_SCOPES,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
  RESULT_TYPES,
} from "../../src/protocol/constants.js";
import type {
  ClientCapabilities,
  CompleteResult,
  InputRequiredResult,
  JSONRPCRequest,
  ModernRequestMeta,
} from "../../src/protocol/types.js";

/**
 * Valid client capabilities (minimal)
 */
export const VALID_CLIENT_CAPABILITIES: ClientCapabilities = {
  tools: {},
  resources: {},
  prompts: {},
};

/**
 * Valid modern request metadata (minimal required fields)
 */
export const VALID_MODERN_META: ModernRequestMeta = {
  [METADATA_KEYS.PROTOCOL_VERSION]: MODERN_PROTOCOL_VERSION,
  [METADATA_KEYS.CLIENT_CAPABILITIES]: VALID_CLIENT_CAPABILITIES,
};

/**
 * Valid modern request metadata with optional fields
 */
export const VALID_MODERN_META_FULL: ModernRequestMeta = {
  [METADATA_KEYS.PROTOCOL_VERSION]: MODERN_PROTOCOL_VERSION,
  [METADATA_KEYS.CLIENT_CAPABILITIES]: {
    ...VALID_CLIENT_CAPABILITIES,
    subscriptions: {
      toolsListChanged: true,
      resourcesListChanged: true,
    },
  },
  clientInfo: {
    name: "test-client",
    version: "1.0.0",
  },
  progressToken: "test-progress-token",
};

/**
 * Invalid metadata: missing protocol version
 */
export const INVALID_META_MISSING_VERSION = {
  [METADATA_KEYS.CLIENT_CAPABILITIES]: VALID_CLIENT_CAPABILITIES,
};

/**
 * Invalid metadata: missing client capabilities
 */
export const INVALID_META_MISSING_CAPABILITIES = {
  [METADATA_KEYS.PROTOCOL_VERSION]: MODERN_PROTOCOL_VERSION,
};

/**
 * Invalid metadata: unsupported protocol version
 */
export const INVALID_META_UNSUPPORTED_VERSION: ModernRequestMeta = {
  [METADATA_KEYS.PROTOCOL_VERSION]: "2099-12-31",
  [METADATA_KEYS.CLIENT_CAPABILITIES]: VALID_CLIENT_CAPABILITIES,
};

/**
 * Valid complete result (minimal)
 */
export const VALID_COMPLETE_RESULT: CompleteResult = {
  resultType: RESULT_TYPES.COMPLETE,
  _meta: {
    [METADATA_KEYS.SERVER_INFO]: {
      name: "test-server",
      version: "1.0.0",
    },
  },
};

/**
 * Valid complete result with cache hints
 */
export const VALID_COMPLETE_RESULT_WITH_CACHE: CompleteResult = {
  resultType: RESULT_TYPES.COMPLETE,
  _meta: {
    [METADATA_KEYS.SERVER_INFO]: {
      name: "test-server",
      version: "1.0.0",
    },
  },
  ttlMs: 300000,
  cacheScope: CACHE_SCOPES.PRIVATE,
};

/**
 * Valid input-required result (MRTR)
 */
export const VALID_INPUT_REQUIRED_RESULT: InputRequiredResult = {
  resultType: RESULT_TYPES.INPUT_REQUIRED,
  _meta: {
    [METADATA_KEYS.SERVER_INFO]: {
      name: "test-server",
      version: "1.0.0",
    },
  },
  inputRequests: [
    {
      id: "input-1",
      kind: "prompt",
      name: "confirm_action",
      arguments: {},
    },
  ],
  requestState: {
    step: 1,
    context: "test-context",
  },
};

/**
 * Invalid complete result: missing resultType
 */
export const INVALID_RESULT_MISSING_TYPE = {
  _meta: {
    [METADATA_KEYS.SERVER_INFO]: {
      name: "test-server",
      version: "1.0.0",
    },
  },
};

/**
 * Invalid complete result: missing server info
 */
export const INVALID_RESULT_MISSING_SERVER_INFO = {
  resultType: RESULT_TYPES.COMPLETE,
  _meta: {},
};

/**
 * Valid JSON-RPC request with modern metadata
 */
export const VALID_JSONRPC_REQUEST: JSONRPCRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "server/discover",
  params: {
    _meta: VALID_MODERN_META,
  },
};

/**
 * Valid JSON-RPC request for tools/list
 */
export const VALID_TOOLS_LIST_REQUEST: JSONRPCRequest = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list",
  params: {
    _meta: VALID_MODERN_META,
  },
};

/**
 * Valid JSON-RPC request for tools/call
 */
export const VALID_TOOLS_CALL_REQUEST: JSONRPCRequest = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    _meta: VALID_MODERN_META,
    name: "test_tool",
    arguments: {
      param1: "value1",
    },
  },
};

/**
 * Valid HTTP headers for modern Streamable HTTP
 */
export const VALID_MCP_HEADERS = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": "server/discover",
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Valid HTTP headers for tools/call
 */
export const VALID_TOOLS_CALL_HEADERS = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": "tools/call",
  "Mcp-Name": "test_tool",
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Invalid headers: missing protocol version
 */
export const INVALID_HEADERS_MISSING_VERSION = {
  "Mcp-Method": "server/discover",
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Invalid headers: missing method
 */
export const INVALID_HEADERS_MISSING_METHOD = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Invalid headers: method mismatch with body
 */
export const INVALID_HEADERS_METHOD_MISMATCH = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": "tools/list",
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Invalid headers: missing name for tools/call
 */
export const INVALID_HEADERS_MISSING_NAME = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": "tools/call",
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Invalid headers: name mismatch with body
 */
export const INVALID_HEADERS_NAME_MISMATCH = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": "tools/call",
  "Mcp-Name": "wrong_tool",
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

/**
 * Invalid headers: unsupported Accept header
 */
export const INVALID_HEADERS_UNSUPPORTED_ACCEPT = {
  "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
  "Mcp-Method": "server/discover",
  Accept: "text/html",
  "Content-Type": "application/json",
};
