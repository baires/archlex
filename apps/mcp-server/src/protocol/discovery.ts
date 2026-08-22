import { SERVER_INSTRUCTIONS, registryCapabilities } from "../registry.js";
import {
  JSONRPC_ERROR_CODES,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "./constants.js";
import { McpProtocolError } from "./errors.js";
import { completeResult } from "./results.js";
import type { ModernRequestContext } from "./types.js";

export function validateDiscoveryParams(params: Record<string, unknown>): void {
  const methodParams = Object.keys(params).filter((key) => key !== "_meta");
  if (methodParams.length > 0) {
    throw new McpProtocolError(
      JSONRPC_ERROR_CODES.INVALID_PARAMS,
      "server/discover accepts no method-specific parameters",
      400,
      { unexpectedParameters: methodParams },
    );
  }
}

function completeDiscovery(context: ModernRequestContext) {
  return completeResult(
    {
      supportedVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
      capabilities: registryCapabilities(),
      instructions: SERVER_INSTRUCTIONS,
    },
    context,
    {
      cacheable: true,
      cache: { ttlMs: 3_600_000, cacheScope: "public" },
    },
  );
}

export function discover(
  context: ModernRequestContext,
): ReturnType<typeof completeDiscovery> {
  return completeDiscovery(context);
}
