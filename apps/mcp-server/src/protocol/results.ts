import {
  type InputRequests,
  type InputRequiredResult,
  type InputRequiredSpec,
  type InputResponses,
  inputRequired,
  inputResponse,
} from "@modelcontextprotocol/server";
import { JSONRPC_ERROR_CODES, MCP_ERROR_CODES } from "./constants.js";
import { McpProtocolError } from "./errors.js";
import type {
  CacheHints,
  CompleteResult,
  ModernRequestContext,
} from "./types.js";

export const SERVER_INFO = {
  name: "archlex-mcp-server",
  version: "0.1.0",
} as const;

interface NonCacheableOptions {
  cacheable?: false;
}

interface CacheableOptions {
  cacheable: true;
  cache: CacheHints;
}

type CompleteOptions = NonCacheableOptions | CacheableOptions;
type CompleteEnvelope<T extends Record<string, unknown>> = CompleteResult<T> &
  Partial<CacheHints>;

export function completeResult<T extends Record<string, unknown>>(
  payload: T,
  context: ModernRequestContext,
  options?: NonCacheableOptions,
): CompleteEnvelope<T>;
export function completeResult<T extends Record<string, unknown>>(
  payload: T,
  context: ModernRequestContext,
  options: CacheableOptions,
): CompleteEnvelope<T> & CacheHints;
export function completeResult<T extends Record<string, unknown>>(
  payload: T,
  context: ModernRequestContext,
  options?: CompleteOptions | { cacheable: true; cache?: CacheHints },
): CompleteEnvelope<T> {
  void context;
  if (options?.cacheable && !options.cache) {
    throw new TypeError("Cache hints are required for a cacheable result");
  }
  return {
    ...payload,
    resultType: "complete",
    _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
    ...(options?.cacheable ? options.cache : {}),
  };
}

const CAPABILITY_BY_METHOD = {
  "elicitation/create": "elicitation",
  "sampling/createMessage": "sampling",
  "roots/list": "roots",
} as const;

export function inputRequiredResult(
  spec: InputRequiredSpec,
  context: ModernRequestContext,
): InputRequiredResult {
  for (const request of Object.values(spec.inputRequests ?? {})) {
    const capability = CAPABILITY_BY_METHOD[request.method];
    if (!(capability in context.clientCapabilities)) {
      throw new McpProtocolError(
        MCP_ERROR_CODES.MISSING_REQUIRED_CLIENT_CAPABILITY,
        `Client capability '${capability}' is required for ${request.method}`,
        400,
        { requiredCapabilities: { [capability]: {} } },
      );
    }
  }
  return inputRequired(spec);
}

type InputResponseEntries = ReadonlyArray<readonly [string, unknown]>;

function responseEntries(
  responses: Record<string, unknown> | InputResponseEntries,
): InputResponseEntries {
  return Array.isArray(responses) ? responses : Object.entries(responses);
}

function invalidResponses(message: string, data?: unknown): never {
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    message,
    400,
    data,
  );
}

export function validateInputResponses(
  requests: InputRequests,
  responses: Record<string, unknown> | InputResponseEntries,
): InputResponses {
  const expectedIds = new Set(Object.keys(requests));
  const seenIds = new Set<string>();
  const normalized: Record<string, unknown> = {};

  for (const [id, response] of responseEntries(responses)) {
    if (seenIds.has(id)) {
      invalidResponses(`Duplicate input response '${id}'`, {
        inputRequestId: id,
      });
    }
    if (!expectedIds.has(id)) {
      invalidResponses(`Unknown input response '${id}'`, {
        inputRequestId: id,
      });
    }
    seenIds.add(id);
    normalized[id] = response;
  }

  for (const [id, request] of Object.entries(requests)) {
    const expectedKind =
      request.method === "elicitation/create"
        ? "elicit"
        : request.method === "sampling/createMessage"
          ? "sampling"
          : "roots";
    const actualKind = inputResponse(normalized, id).kind;
    if (actualKind !== expectedKind) {
      invalidResponses(`Wrong input response kind for '${id}'`, {
        inputRequestId: id,
        expectedKind,
        actualKind,
      });
    }
  }

  return normalized as InputResponses;
}
