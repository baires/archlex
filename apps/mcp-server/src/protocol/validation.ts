import {
  ClientCapabilitiesSchema,
  ImplementationSchema,
  JSONRPCRequestSchema,
  ProgressTokenSchema,
} from "@modelcontextprotocol/core";
import type {
  ClientCapabilities,
  JsonSchemaType,
} from "@modelcontextprotocol/server";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/server/validators/cf-worker";
import {
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  METADATA_KEYS,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "./constants.js";
import { McpProtocolError } from "./errors.js";
import type { ModernRequestContext } from "./types.js";

const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const schemaValidator = new CfWorkerJsonSchemaValidator();

function invalidParams(message: string, data?: unknown): never {
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    message,
    400,
    data,
  );
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function validateModernRequest(message: unknown): ModernRequestContext {
  const parsed = JSONRPCRequestSchema.safeParse(message);
  if (!parsed.success) {
    invalidParams("Malformed JSON-RPC request", {
      issues: parsed.error.issues,
    });
  }

  const params = record(parsed.data.params);
  const meta = record(params?._meta);
  if (!meta) invalidParams("Request params._meta is required");

  const requested = meta[METADATA_KEYS.PROTOCOL_VERSION];
  if (typeof requested !== "string") {
    invalidParams(
      `${METADATA_KEYS.PROTOCOL_VERSION} is required and must be a string`,
    );
  }
  if (requested !== MODERN_PROTOCOL_VERSION) {
    throw new McpProtocolError(
      MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION,
      `Unsupported protocol version '${requested}'`,
      400,
      { requested, supported: [...SUPPORTED_PROTOCOL_VERSIONS] },
    );
  }

  const capabilitiesValue = meta[METADATA_KEYS.CLIENT_CAPABILITIES];
  if (capabilitiesValue === undefined) {
    invalidParams(`${METADATA_KEYS.CLIENT_CAPABILITIES} is required`);
  }
  const capabilities = ClientCapabilitiesSchema.safeParse(capabilitiesValue);
  if (!capabilities.success) {
    invalidParams("Invalid client capabilities", {
      issues: capabilities.error.issues,
    });
  }

  const clientInfoValue = meta[METADATA_KEYS.CLIENT_INFO];
  const clientInfo =
    clientInfoValue === undefined
      ? undefined
      : ImplementationSchema.safeParse(clientInfoValue);
  if (clientInfo && !clientInfo.success) {
    invalidParams("Invalid clientInfo", { issues: clientInfo.error.issues });
  }

  const progressValue = meta[METADATA_KEYS.PROGRESS_TOKEN];
  const progressToken =
    progressValue === undefined
      ? undefined
      : ProgressTokenSchema.safeParse(progressValue);
  if (progressToken && !progressToken.success) {
    invalidParams("Invalid progressToken", {
      issues: progressToken.error.issues,
    });
  }

  return {
    protocolVersion: MODERN_PROTOCOL_VERSION,
    clientCapabilities: capabilities.data,
    ...(clientInfo?.success ? { clientInfo: clientInfo.data } : {}),
    ...(progressToken?.success ? { progressToken: progressToken.data } : {}),
    requestId: parsed.data.id,
  };
}

function hasPath(value: unknown, path: readonly string[]): boolean {
  let current: unknown = value;
  for (const segment of path) {
    const currentRecord = record(current);
    if (!currentRecord || !(segment in currentRecord)) return false;
    current = currentRecord[segment];
  }
  return true;
}

function addRequiredPath(
  target: Record<string, unknown>,
  path: readonly string[],
): void {
  let current = target;
  for (const segment of path) {
    const next = record(current[segment]) ?? {};
    current[segment] = next;
    current = next;
  }
}

export function requireClientCapabilities(
  context: ModernRequestContext,
  paths: readonly string[],
): void {
  const missing = paths
    .map((path) => path.split(".").filter(Boolean))
    .filter((path) => path.length > 0)
    .filter((path) => !hasPath(context.clientCapabilities, path));
  if (missing.length === 0) return;

  const requiredCapabilities: Record<string, unknown> = {};
  for (const path of missing) addRequiredPath(requiredCapabilities, path);
  throw new McpProtocolError(
    MCP_ERROR_CODES.MISSING_REQUIRED_CLIENT_CAPABILITY,
    "Missing required client capability",
    400,
    { requiredCapabilities },
  );
}

export function validateJsonSchema(
  schema: unknown,
  ...values: [] | [unknown]
): void {
  if (typeof schema !== "boolean" && !record(schema)) {
    invalidParams("JSON Schema must be an object or boolean");
  }
  const dialect = record(schema)?.$schema;
  if (dialect !== undefined && dialect !== JSON_SCHEMA_2020_12) {
    invalidParams(`Unsupported JSON Schema dialect '${String(dialect)}'`, {
      requested: dialect,
      supported: [JSON_SCHEMA_2020_12],
    });
  }
  let validator: ReturnType<CfWorkerJsonSchemaValidator["getValidator"]>;
  try {
    validator = schemaValidator.getValidator(schema as JsonSchemaType);
  } catch (error: unknown) {
    invalidParams("Invalid JSON Schema", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  if (values.length === 1) {
    const result = validator(values[0]);
    if (!result.valid) {
      invalidParams("Value does not match JSON Schema", {
        reason: result.errorMessage,
      });
    }
  }
}
