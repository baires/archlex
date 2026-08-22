/**
 * MCP protocol types used by ArchLex.
 *
 * Wire and public protocol vocabulary comes from the official v2 SDK. Local
 * types below describe only ArchLex adapter state and the complete-result wire
 * envelope that SDK v2 intentionally hides from handler-facing public types.
 */

import type {
  CacheScope,
  ClientCapabilities,
  Implementation,
  LoggingLevel,
  ProgressToken,
  RequestId,
} from "@modelcontextprotocol/server";
import type { MODERN_PROTOCOL_VERSION } from "./constants.js";

export type {
  CacheHint,
  CacheScope,
  ClientCapabilities,
  DiscoverResult,
  InputRequest,
  InputRequests,
  InputRequiredResult,
  InputResponse,
  InputResponses,
  JSONRPCErrorResponse,
  JSONRPCMessage,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResultResponse,
  RequestId,
  Resource,
  ResourceContents,
  SubscriptionFilter,
  Tool,
} from "@modelcontextprotocol/server";

export type ModernRequestMeta = {
  "io.modelcontextprotocol/protocolVersion": typeof MODERN_PROTOCOL_VERSION;
  "io.modelcontextprotocol/clientCapabilities": ClientCapabilities;
  "io.modelcontextprotocol/clientInfo"?: Implementation;
  "io.modelcontextprotocol/logLevel"?: LoggingLevel;
  progressToken?: ProgressToken;
  [key: string]: unknown;
};

export interface ModernRequestContext {
  protocolVersion: typeof MODERN_PROTOCOL_VERSION;
  clientCapabilities: ClientCapabilities;
  clientInfo?: Implementation;
  progressToken?: ProgressToken;
  requestId: RequestId;
}

export interface ModernResponseMeta {
  "io.modelcontextprotocol/serverInfo": Implementation;
  [key: string]: unknown;
}

export interface CacheHints {
  ttlMs: number;
  cacheScope: CacheScope;
}

export type CompleteResult<T extends Record<string, unknown>> = T & {
  resultType: "complete";
  _meta: ModernResponseMeta;
};
