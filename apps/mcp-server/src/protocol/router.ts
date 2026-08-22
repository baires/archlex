import type { JSONRPCRequest, RequestId } from "@modelcontextprotocol/server";
import {
  callTool,
  getPrompt,
  listPrompts,
  listResources,
  listTools,
  readResource,
} from "../registry.js";
import type { Env } from "../security.js";
import { handleLegacyMcpPost } from "../server.js";
import {
  JSONRPC_ERROR_CODES,
  MCP_HEADERS,
  MCP_METHODS,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "./constants.js";
import { discover, validateDiscoveryParams } from "./discovery.js";
import { McpProtocolError, toHttpErrorResponse } from "./errors.js";
import { validateMcpHeaders } from "./http-headers.js";
import { completeResult } from "./results.js";
import { validateModernRequest } from "./validation.js";

export type ProtocolEra = "modern" | "legacy";

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function classifyProtocolEra(
  message: unknown,
  headers: Headers,
): ProtocolEra {
  const object = record(message);
  const params = record(object?.params);
  const meta = record(params?._meta);
  const method = object?.method;
  const modernMetaSignal =
    meta !== undefined &&
    (METADATA_KEYS.PROTOCOL_VERSION in meta ||
      METADATA_KEYS.CLIENT_CAPABILITIES in meta);
  const headerVersion = headers.get(MCP_HEADERS.PROTOCOL_VERSION);
  const legacyVersions = SUPPORTED_PROTOCOL_VERSIONS.filter(
    (version) => version !== MODERN_PROTOCOL_VERSION,
  );
  const modernHeaderSignal =
    headerVersion !== null &&
    !legacyVersions.includes(headerVersion as (typeof legacyVersions)[number]);

  if (method === "initialize") {
    if (modernMetaSignal || modernHeaderSignal) {
      throw new McpProtocolError(
        JSONRPC_ERROR_CODES.INVALID_REQUEST,
        "initialize cannot carry modern protocol signals",
        400,
      );
    }
    return "legacy";
  }
  if (modernMetaSignal || modernHeaderSignal) return "modern";
  if (headerVersion && legacyVersions.includes(headerVersion as never)) {
    return "legacy";
  }
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    "Request does not unambiguously identify a protocol era",
    400,
  );
}

function withHeaders(
  response: Response,
  extraHeaders: Readonly<Record<string, string>>,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }
  headers.delete(MCP_HEADERS.SESSION_ID);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function modernJsonResponse(id: RequestId, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function dispatchModern(
  message: JSONRPCRequest,
  env?: Env,
): Promise<unknown> {
  const context = validateModernRequest(message);
  const options = { enableMcpApps: env?.ENABLE_MCP_APPS === "true" };
  const params = record(message.params) ?? {};
  switch (message.method) {
    case MCP_METHODS.SERVER_DISCOVER:
      validateDiscoveryParams(params);
      return discover(context);
    case MCP_METHODS.TOOLS_LIST:
      return completeResult({ tools: listTools(options) }, context);
    case MCP_METHODS.TOOLS_CALL:
      return completeResult(
        (await callTool(
          String(params.name),
          record(params.arguments),
          options,
        )) as unknown as Record<string, unknown>,
        context,
      );
    case MCP_METHODS.RESOURCES_LIST:
      return completeResult({ resources: listResources() }, context);
    case MCP_METHODS.RESOURCES_READ:
      return completeResult(
        readResource(String(params.uri)) as unknown as Record<string, unknown>,
        context,
      );
    case MCP_METHODS.PROMPTS_LIST:
      return completeResult({ prompts: listPrompts() }, context);
    case MCP_METHODS.PROMPTS_GET:
      return completeResult(
        getPrompt(
          String(params.name),
          params.arguments as Record<string, string> | undefined,
        ) as unknown as Record<string, unknown>,
        context,
      );
    default:
      throw new McpProtocolError(
        JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
        `Unknown method '${message.method}'`,
        404,
        { method: message.method },
      );
  }
}

export async function handleMcpPost(
  request: Request,
  env?: Env,
  responseHeaders: Readonly<Record<string, string>> = {},
): Promise<Response> {
  const legacyRequest = request.clone() as Request;
  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return withHeaders(
      toHttpErrorResponse(
        new McpProtocolError(
          JSONRPC_ERROR_CODES.PARSE_ERROR,
          "Parse error",
          400,
        ),
        null,
      ),
      responseHeaders,
    );
  }

  const object = record(message);
  const id =
    typeof object?.id === "string" || typeof object?.id === "number"
      ? object.id
      : null;
  try {
    const era = classifyProtocolEra(message, request.headers);
    if (era === "legacy") {
      return withHeaders(
        await handleLegacyMcpPost(legacyRequest, env),
        responseHeaders,
      );
    }
    const context = validateModernRequest(message);
    const tools = listTools({ enableMcpApps: env?.ENABLE_MCP_APPS === "true" });
    validateMcpHeaders(request, message as JSONRPCRequest, tools);
    const result = await dispatchModern(message as JSONRPCRequest, env);
    return withHeaders(
      modernJsonResponse(context.requestId, result),
      responseHeaders,
    );
  } catch (error: unknown) {
    const protocolError =
      error instanceof McpProtocolError
        ? error
        : new McpProtocolError(
            JSONRPC_ERROR_CODES.INTERNAL_ERROR,
            "Internal error",
            500,
          );
    return withHeaders(toHttpErrorResponse(protocolError, id), responseHeaders);
  }
}
