/**
 * MCP 2026-07-28 Protocol Constants
 *
 * These constants define the exact protocol version and supported versions
 * that this server implements. Only advertise versions with passing conformance tests.
 */

/**
 * The modern protocol version this server implements.
 * Must match exactly "2026-07-28" per the MCP specification.
 */
export const MODERN_PROTOCOL_VERSION = "2026-07-28" as const;

/**
 * Ordered list of protocol versions this server supports.
 * Only includes versions covered by conformance tests.
 *
 * Currently supports:
 * - 2026-07-28: Modern stateless protocol with per-request metadata
 * - 2025-03-26: Legacy initialization-era protocol (via SDK)
 */
export const SUPPORTED_PROTOCOL_VERSIONS = [
  MODERN_PROTOCOL_VERSION,
  "2025-03-26",
] as const;

/**
 * Metadata keys used in modern MCP requests and responses
 */
export const METADATA_KEYS = {
  PROTOCOL_VERSION: "io.modelcontextprotocol/protocolVersion",
  CLIENT_CAPABILITIES: "io.modelcontextprotocol/clientCapabilities",
  SERVER_INFO: "io.modelcontextprotocol/serverInfo",
  SUBSCRIPTION_ID: "io.modelcontextprotocol/subscriptionId",
  PROGRESS_TOKEN: "progressToken",
} as const;

/**
 * Modern MCP method names
 */
export const MCP_METHODS = {
  // Discovery
  SERVER_DISCOVER: "server/discover",

  // Tools
  TOOLS_LIST: "tools/list",
  TOOLS_CALL: "tools/call",

  // Resources
  RESOURCES_LIST: "resources/list",
  RESOURCES_READ: "resources/read",
  RESOURCES_TEMPLATES_LIST: "resources/templates/list",

  // Prompts
  PROMPTS_LIST: "prompts/list",
  PROMPTS_GET: "prompts/get",

  // Subscriptions
  SUBSCRIPTIONS_LISTEN: "subscriptions/listen",

  // Completion (optional)
  COMPLETION_COMPLETE: "completion/complete",

  // Notifications
  NOTIFICATIONS_CANCELLED: "notifications/cancelled",
  NOTIFICATIONS_PROGRESS: "notifications/progress",
  NOTIFICATIONS_MESSAGE: "notifications/message",
  NOTIFICATIONS_SUBSCRIPTIONS_ACKNOWLEDGED:
    "notifications/subscriptions/acknowledged",
  NOTIFICATIONS_TOOLS_LIST_CHANGED: "notifications/tools/list_changed",
  NOTIFICATIONS_RESOURCES_LIST_CHANGED: "notifications/resources/list_changed",
  NOTIFICATIONS_PROMPTS_LIST_CHANGED: "notifications/prompts/list_changed",
  NOTIFICATIONS_RESOURCE_UPDATED: "notifications/resources/updated",
} as const;

/**
 * JSON-RPC 2.0 error codes
 */
export const JSONRPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * MCP-specific error codes
 */
export const MCP_ERROR_CODES = {
  HEADER_MISMATCH: -32020,
  CAPABILITY_NOT_SUPPORTED: -32021,
  UNSUPPORTED_VERSION: -32022,
} as const;

/**
 * HTTP headers used in Streamable HTTP transport
 */
export const MCP_HEADERS = {
  PROTOCOL_VERSION: "MCP-Protocol-Version",
  METHOD: "Mcp-Method",
  NAME: "Mcp-Name",
  SESSION_ID: "Mcp-Session-Id", // Legacy only, never used in modern
  PARAM_PREFIX: "Mcp-Param-",
} as const;

/**
 * Result types for modern MCP responses
 */
export const RESULT_TYPES = {
  COMPLETE: "complete",
  INPUT_REQUIRED: "input_required",
} as const;

/**
 * Cache scopes for cacheable results
 */
export const CACHE_SCOPES = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const;

/**
 * Default pagination page size
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum pagination page size
 */
export const MAX_PAGE_SIZE = 100;
