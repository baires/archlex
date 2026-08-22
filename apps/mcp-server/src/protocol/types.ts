/**
 * MCP 2026-07-28 Protocol Types
 *
 * Local type definitions derived from the official 2026-07-28 schema.
 * These types define the contract for modern MCP requests and responses.
 */

import type { CACHE_SCOPES, RESULT_TYPES } from "./constants.js";

/**
 * Server identity information included in modern responses
 */
export interface ServerInfo {
  name: string;
  version: string;
}

/**
 * Client capabilities declared in request metadata
 */
export interface ClientCapabilities {
  [key: string]: unknown;
}

/**
 * Modern request metadata (required on every modern request)
 */
export interface ModernRequestMeta {
  "io.modelcontextprotocol/protocolVersion": string;
  "io.modelcontextprotocol/clientCapabilities": ClientCapabilities;
  clientInfo?: {
    name: string;
    version: string;
  };
  progressToken?: string | number;
  [key: string]: unknown;
}

/**
 * Modern response metadata (required on every modern result)
 */
export interface ModernResponseMeta {
  "io.modelcontextprotocol/serverInfo": ServerInfo;
  [key: string]: unknown;
}

/**
 * Context extracted and validated from a modern request
 */
export interface ModernRequestContext {
  protocolVersion: string;
  clientCapabilities: ClientCapabilities;
  clientInfo?: {
    name: string;
    version: string;
  };
  progressToken?: string | number;
  requestId: string | number | null;
}

/**
 * Cache hints for cacheable results
 */
export interface CacheHints {
  /**
   * Time-to-live in milliseconds
   */
  ttlMs: number;
  /**
   * Cache scope: "public" or "private"
   */
  cacheScope: (typeof CACHE_SCOPES)[keyof typeof CACHE_SCOPES];
}

/**
 * Complete result envelope (normal successful response)
 */
export interface CompleteResult<T = unknown> {
  resultType: typeof RESULT_TYPES.COMPLETE;
  _meta: ModernResponseMeta;
  [key: string]: unknown;
}

/**
 * Input request for MRTR (Multi-Round Task Resolution)
 */
export interface InputRequest {
  id: string;
  kind: "prompt" | "tool_call" | "resource_read";
  [key: string]: unknown;
}

/**
 * Input response from client for MRTR
 */
export interface InputResponse {
  inputRequestId: string;
  [key: string]: unknown;
}

/**
 * Input-required result envelope (MRTR interim response)
 */
export interface InputRequiredResult {
  resultType: typeof RESULT_TYPES.INPUT_REQUIRED;
  _meta: ModernResponseMeta;
  inputRequests: InputRequest[];
  requestState?: unknown;
}

/**
 * JSON-RPC 2.0 request structure
 */
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: {
    _meta?: ModernRequestMeta;
    [key: string]: unknown;
  };
}

/**
 * JSON-RPC 2.0 success response structure
 */
export interface JSONRPCSuccessResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result: CompleteResult | InputRequiredResult;
}

/**
 * JSON-RPC 2.0 error response structure
 */
export interface JSONRPCErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * JSON-RPC 2.0 notification structure
 */
export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: {
    _meta?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Discovery result structure
 */
export interface DiscoverResult extends CompleteResult {
  supportedVersions: string[];
  capabilities: {
    tools?: Record<string, unknown>;
    resources?: Record<string, unknown>;
    prompts?: Record<string, unknown>;
    subscriptions?: {
      toolsListChanged?: boolean;
      promptsListChanged?: boolean;
      resourcesListChanged?: boolean;
      resourceSubscriptions?: boolean;
    };
    completions?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
  };
  instructions?: string;
}

/**
 * Pagination cursor (opaque string)
 */
export type PaginationCursor = string;

/**
 * Tool definition structure
 */
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

/**
 * Resource definition structure
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
}

/**
 * Prompt definition structure
 */
export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  _meta?: Record<string, unknown>;
}

/**
 * Tool content item (text or image)
 */
export type ToolContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      data: string;
      mimeType: string;
    };

/**
 * Resource content item
 */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
  _meta?: Record<string, unknown>;
}

/**
 * Prompt message structure
 */
export interface PromptMessage {
  role: "user" | "assistant";
  content: {
    type: "text" | "image" | "resource";
    [key: string]: unknown;
  };
}

/**
 * Subscription filter for subscriptions/listen
 */
export interface SubscriptionFilter {
  toolsListChanged?: boolean;
  promptsListChanged?: boolean;
  resourcesListChanged?: boolean;
  resourceSubscriptions?: Array<{
    uri: string;
  }>;
}
