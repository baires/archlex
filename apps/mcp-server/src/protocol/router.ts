import {
  CallToolRequestSchema,
  CompleteRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  SubscriptionsListenRequestSchema,
} from "@modelcontextprotocol/core";
import type {
  CallToolResult,
  JSONRPCRequest,
  RequestId,
  SubscriptionFilter,
  Tool,
} from "@modelcontextprotocol/server";
import { completeArgument } from "../completion.js";
import {
  callTool,
  getPrompt,
  listPrompts,
  listResources,
  listTools,
  readResource,
} from "../registry.js";
import type { RegistryOptions } from "../registry.js";
import { listResourceTemplates } from "../resource-templates.js";
import type { Env } from "../security.js";
import { handleLegacyMcpPost } from "../server.js";
import {
  DEFAULT_PAGE_SIZE,
  JSONRPC_ERROR_CODES,
  LEGACY_PROTOCOL_VERSIONS,
  MCP_HEADERS,
  MCP_METHODS,
  METADATA_KEYS,
} from "./constants.js";
import { discover, validateDiscoveryParams } from "./discovery.js";
import {
  McpProtocolError,
  acceptedNotificationResponse,
  toHttpErrorResponse,
} from "./errors.js";
import { validateMcpHeaders } from "./http-headers.js";
import { paginate } from "./pagination.js";
import { progressResponse, requestProgressToken } from "./progress.js";
import { completeResult } from "./results.js";
import { subscriptionResponse } from "./subscriptions.js";
import {
  validateJsonSchema,
  validateModernRequest,
  validateToolResult,
} from "./validation.js";

export type ProtocolEra = "modern" | "legacy";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const ABSOLUTE_REQUEST_TIMEOUT_MS = 120_000;

export interface RequestAbortScope {
  signal: AbortSignal;
  timeoutMs: number;
  abort: (reason?: unknown) => void;
  cleanup: () => void;
}

function configuredTimeout(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function createRequestAbortScope(
  requestSignal: AbortSignal,
  env?: Env,
): RequestAbortScope {
  const configuredMaximum = configuredTimeout(env?.MCP_MAX_REQUEST_TIMEOUT_MS);
  const maximum = Math.min(
    configuredMaximum ?? ABSOLUTE_REQUEST_TIMEOUT_MS,
    ABSOLUTE_REQUEST_TIMEOUT_MS,
  );
  const timeoutMs = Math.min(
    configuredTimeout(env?.MCP_REQUEST_TIMEOUT_MS) ??
      DEFAULT_REQUEST_TIMEOUT_MS,
    maximum,
  );
  const controller = new AbortController();
  const relayAbort = (): void => controller.abort(requestSignal.reason);
  requestSignal.addEventListener("abort", relayAbort, { once: true });
  if (requestSignal.aborted) relayAbort();
  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException(`MCP request exceeded ${timeoutMs}ms`, "TimeoutError"),
      ),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    timeoutMs,
    abort: (reason?: unknown) => controller.abort(reason),
    cleanup: () => {
      clearTimeout(timeout);
      requestSignal.removeEventListener("abort", relayAbort);
    },
  };
}

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
  const modernHeaderSignal =
    headerVersion !== null &&
    !LEGACY_PROTOCOL_VERSIONS.includes(
      headerVersion as (typeof LEGACY_PROTOCOL_VERSIONS)[number],
    );

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
  if (
    headerVersion &&
    LEGACY_PROTOCOL_VERSIONS.includes(
      headerVersion as (typeof LEGACY_PROTOCOL_VERSIONS)[number],
    )
  ) {
    return "legacy";
  }
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    "Request does not unambiguously identify a protocol era",
    400,
  );
}

function invalidParams(message: string, data?: unknown): never {
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    message,
    400,
    data,
  );
}

function validateMethodShape(message: JSONRPCRequest): void {
  const parsed = (() => {
    switch (message.method) {
      case MCP_METHODS.TOOLS_LIST:
        return ListToolsRequestSchema.safeParse(message);
      case MCP_METHODS.TOOLS_CALL:
        return CallToolRequestSchema.safeParse(message);
      case MCP_METHODS.RESOURCES_LIST:
        return ListResourcesRequestSchema.safeParse(message);
      case MCP_METHODS.RESOURCES_READ:
        return ReadResourceRequestSchema.safeParse(message);
      case MCP_METHODS.RESOURCES_TEMPLATES_LIST:
        return ListResourceTemplatesRequestSchema.safeParse(message);
      case MCP_METHODS.PROMPTS_LIST:
        return ListPromptsRequestSchema.safeParse(message);
      case MCP_METHODS.PROMPTS_GET:
        return GetPromptRequestSchema.safeParse(message);
      case MCP_METHODS.SUBSCRIPTIONS_LISTEN:
        return SubscriptionsListenRequestSchema.safeParse(message);
      case MCP_METHODS.COMPLETION_COMPLETE:
        return CompleteRequestSchema.safeParse(message);
      default:
        return { success: true } as const;
    }
  })();
  if (!parsed.success) {
    invalidParams(`Invalid parameters for '${message.method}'`, {
      issues: parsed.error.issues,
    });
  }
}

function validateAdvertisedTool(tool: Tool): void {
  try {
    validateJsonSchema(tool.inputSchema);
    if (tool.outputSchema) validateJsonSchema(tool.outputSchema);
  } catch {
    throw new McpProtocolError(
      JSONRPC_ERROR_CODES.INTERNAL_ERROR,
      `Tool '${tool.name}' advertises an invalid JSON Schema`,
      500,
      { tool: tool.name },
    );
  }
}

function requireResource(uri: unknown): string {
  if (typeof uri !== "string") invalidParams("Resource URI must be a string");
  try {
    new URL(uri);
  } catch {
    invalidParams("Resource URI is invalid", { uri });
  }
  if (!listResources().some((resource) => resource.uri === uri)) {
    invalidParams("Resource not found", { uri });
  }
  return uri;
}

function requirePromptArguments(
  name: unknown,
  args: unknown,
): { name: string; arguments?: Record<string, string> } {
  if (typeof name !== "string") invalidParams("Prompt name must be a string");
  const prompt = listPrompts().find((candidate) => candidate.name === name);
  if (!prompt) invalidParams("Prompt not found", { name });
  const argumentsRecord = record(args);
  for (const argument of prompt.arguments ?? []) {
    if (
      argument.required &&
      typeof argumentsRecord?.[argument.name] !== "string"
    ) {
      invalidParams(`Missing required prompt argument '${argument.name}'`, {
        name,
        argument: argument.name,
      });
    }
  }
  return {
    name,
    ...(argumentsRecord
      ? { arguments: argumentsRecord as Record<string, string> }
      : {}),
  };
}

function withHeaders(
  response: Response,
  extraHeaders: Readonly<Record<string, string>>,
): Response {
  for (const [name, value] of Object.entries(extraHeaders)) {
    response.headers.set(name, value);
  }
  response.headers.delete(MCP_HEADERS.SESSION_ID);
  return response;
}

function modernJsonResponse(id: RequestId, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function dispatchModern(
  message: JSONRPCRequest,
  signal: AbortSignal,
  env?: Env,
  onProgress?: RegistryOptions["onProgress"],
): Promise<unknown> {
  const context = validateModernRequest(message);
  const options = {
    enableMcpApps: env?.ENABLE_MCP_APPS === "true",
    signal,
    onProgress,
  };
  const params = record(message.params) ?? {};
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const publicCache = {
    cacheable: true as const,
    cache: { ttlMs: 3_600_000, cacheScope: "public" as const },
  };
  validateMethodShape(message);
  switch (message.method) {
    case MCP_METHODS.SERVER_DISCOVER:
      validateDiscoveryParams(params);
      return discover(context);
    case MCP_METHODS.TOOLS_LIST: {
      const tools = listTools(options);
      for (const tool of tools) validateAdvertisedTool(tool);
      const page = paginate(tools, cursor, DEFAULT_PAGE_SIZE);
      return completeResult(
        {
          tools: page.items,
          ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        },
        context,
        publicCache,
      );
    }
    case MCP_METHODS.TOOLS_CALL: {
      const toolName = params.name;
      const tool = listTools(options).find(
        (candidate) => candidate.name === toolName,
      );
      if (!tool || typeof toolName !== "string") {
        invalidParams("Tool not found", { name: toolName });
      }
      const args = record(params.arguments) ?? {};
      validateJsonSchema(tool.inputSchema, args);
      const result = (await callTool(
        toolName,
        args,
        options,
      )) as CallToolResult;
      validateToolResult(tool, result);
      return completeResult(
        result as unknown as Record<string, unknown>,
        context,
      );
    }
    case MCP_METHODS.RESOURCES_LIST: {
      const page = paginate(listResources(), cursor, DEFAULT_PAGE_SIZE);
      return completeResult(
        {
          resources: page.items,
          ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        },
        context,
        publicCache,
      );
    }
    case MCP_METHODS.RESOURCES_TEMPLATES_LIST: {
      const page = paginate(listResourceTemplates(), cursor, DEFAULT_PAGE_SIZE);
      return completeResult(
        {
          resourceTemplates: page.items,
          ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        },
        context,
        publicCache,
      );
    }
    case MCP_METHODS.RESOURCES_READ:
      return completeResult(
        readResource(requireResource(params.uri)) as unknown as Record<
          string,
          unknown
        >,
        context,
        publicCache,
      );
    case MCP_METHODS.PROMPTS_LIST: {
      const page = paginate(listPrompts(), cursor, DEFAULT_PAGE_SIZE);
      return completeResult(
        {
          prompts: page.items,
          ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        },
        context,
        publicCache,
      );
    }
    case MCP_METHODS.PROMPTS_GET: {
      const prompt = requirePromptArguments(params.name, params.arguments);
      return completeResult(
        getPrompt(prompt.name, prompt.arguments) as unknown as Record<
          string,
          unknown
        >,
        context,
      );
    }
    case MCP_METHODS.COMPLETION_COMPLETE:
      return completeResult(
        completeArgument(params) as unknown as Record<string, unknown>,
        context,
      );
    case MCP_METHODS.SUBSCRIPTIONS_LISTEN:
      return subscriptionResponse(
        context.requestId,
        record(params.notifications) as SubscriptionFilter,
        {
          signal,
          supportedNotifications: {},
        },
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
    if (object && typeof object.method === "string" && !("id" in object)) {
      return withHeaders(acceptedNotificationResponse(), responseHeaders);
    }
    const context = validateModernRequest(message);
    const tools = listTools({ enableMcpApps: env?.ENABLE_MCP_APPS === "true" });
    validateMcpHeaders(request, message as JSONRPCRequest, tools);
    const abortScope =
      object?.method === MCP_METHODS.SUBSCRIPTIONS_LISTEN
        ? undefined
        : createRequestAbortScope(request.signal, env);
    let cleanupTransferred = false;
    try {
      const params = record((message as JSONRPCRequest).params) ?? {};
      const progressToken = requestProgressToken(params);
      const isProgressiveRender =
        object?.method === MCP_METHODS.TOOLS_CALL &&
        params.name === "render_diagram" &&
        progressToken !== undefined &&
        abortScope !== undefined;
      if (isProgressiveRender) {
        cleanupTransferred = true;
        return withHeaders(
          progressResponse(
            context.requestId,
            progressToken,
            (onProgress) =>
              dispatchModern(
                message as JSONRPCRequest,
                abortScope.signal,
                env,
                onProgress,
              ),
            { abort: abortScope.abort, cleanup: abortScope.cleanup },
          ),
          responseHeaders,
        );
      }
      const result = await dispatchModern(
        message as JSONRPCRequest,
        abortScope?.signal ?? request.signal,
        env,
      );
      if (result instanceof Response) {
        return withHeaders(result, responseHeaders);
      }
      return withHeaders(
        modernJsonResponse(context.requestId, result),
        responseHeaders,
      );
    } finally {
      if (!cleanupTransferred) abortScope?.cleanup();
    }
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
