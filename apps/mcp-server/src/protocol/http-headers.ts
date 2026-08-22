import type { JSONRPCRequest, Tool } from "@modelcontextprotocol/server";
import {
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  MCP_HEADERS,
  MCP_METHODS,
  METADATA_KEYS,
} from "./constants.js";
import { McpProtocolError } from "./errors.js";

const BASE64_PREFIX = "=?base64?";
const BASE64_SUFFIX = "?=";
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const SAFE_PLAIN_VALUE = /^[\x20-\x7e\t]*$/;
const HEADER_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const IMPLEMENTED_MODERN_METHODS = new Set<string>([
  MCP_METHODS.SERVER_DISCOVER,
  MCP_METHODS.TOOLS_LIST,
  MCP_METHODS.TOOLS_CALL,
  MCP_METHODS.RESOURCES_LIST,
  MCP_METHODS.RESOURCES_READ,
  MCP_METHODS.PROMPTS_LIST,
  MCP_METHODS.PROMPTS_GET,
  MCP_METHODS.SUBSCRIPTIONS_LISTEN,
]);

const NAMED_METHOD_FIELD: Readonly<Record<string, "name" | "uri">> = {
  [MCP_METHODS.TOOLS_CALL]: "name",
  [MCP_METHODS.RESOURCES_READ]: "uri",
  [MCP_METHODS.PROMPTS_GET]: "name",
};

interface HeaderBinding {
  headerName: string;
  path: string[];
  type: "string" | "integer" | "boolean";
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function headerMismatch(message: string, data?: unknown): never {
  throw new McpProtocolError(
    MCP_ERROR_CODES.HEADER_MISMATCH,
    `Header mismatch: ${message}`,
    400,
    data,
  );
}

function invalidSchema(message: string, data?: unknown): never {
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    message,
    400,
    data,
  );
}

export function decodeMcpHeaderValue(value: string): string {
  if (value.startsWith(BASE64_PREFIX)) {
    if (!value.endsWith(BASE64_SUFFIX)) {
      headerMismatch("malformed Base64 sentinel");
    }
    const encoded = value.slice(BASE64_PREFIX.length, -BASE64_SUFFIX.length);
    if (!BASE64_PATTERN.test(encoded)) {
      headerMismatch("malformed Base64 payload");
    }
    try {
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      headerMismatch("invalid Base64 UTF-8 payload");
    }
  }

  if (
    !SAFE_PLAIN_VALUE.test(value) ||
    value.trim() !== value ||
    (value.startsWith(BASE64_PREFIX) && value.endsWith(BASE64_SUFFIX))
  ) {
    headerMismatch("unsafe plain header value");
  }
  return value;
}

const SINGLE_SCHEMA_KEYWORDS = [
  "additionalProperties",
  "unevaluatedProperties",
  "propertyNames",
  "contains",
  "items",
  "not",
  "if",
  "then",
  "else",
] as const;
const ARRAY_SCHEMA_KEYWORDS = [
  "prefixItems",
  "allOf",
  "anyOf",
  "oneOf",
] as const;
const MAP_SCHEMA_KEYWORDS = [
  "$defs",
  "definitions",
  "patternProperties",
  "dependentSchemas",
] as const;

function scanDisallowedAnnotations(
  value: unknown,
  allowCurrent: boolean,
): void {
  const object = record(value);
  if (!object) return;
  if ("x-mcp-header" in object && !allowCurrent) {
    invalidSchema(
      "x-mcp-header is not statically reachable through properties",
    );
  }
  for (const keyword of SINGLE_SCHEMA_KEYWORDS) {
    scanDisallowedAnnotations(object[keyword], false);
  }
  for (const keyword of ARRAY_SCHEMA_KEYWORDS) {
    const schemas = object[keyword];
    if (Array.isArray(schemas)) {
      for (const schema of schemas) scanDisallowedAnnotations(schema, false);
    }
  }
  for (const keyword of MAP_SCHEMA_KEYWORDS) {
    const schemas = record(object[keyword]);
    if (schemas) {
      for (const schema of Object.values(schemas)) {
        scanDisallowedAnnotations(schema, false);
      }
    }
  }
}

function toolHeaderBindings(tool: Tool): HeaderBinding[] {
  const bindings: HeaderBinding[] = [];
  const names = new Set<string>();

  function visitProperties(schema: unknown, path: string[]): void {
    const schemaObject = record(schema);
    if (!schemaObject) return;
    scanDisallowedAnnotations(schemaObject, path.length > 0);
    const properties = record(schemaObject.properties);
    if (!properties) return;

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      const property = record(propertySchema);
      if (!property) continue;
      const propertyPath = [...path, propertyName];
      const annotation = property["x-mcp-header"];
      if (annotation !== undefined) {
        if (
          typeof annotation !== "string" ||
          annotation.length === 0 ||
          !HEADER_TOKEN.test(annotation)
        ) {
          invalidSchema(`Invalid x-mcp-header on '${propertyPath.join(".")}'`);
        }
        if (
          property.type !== "string" &&
          property.type !== "integer" &&
          property.type !== "boolean"
        ) {
          invalidSchema(
            `x-mcp-header requires string, integer, or boolean at '${propertyPath.join(".")}'`,
          );
        }
        const foldedName = annotation.toLowerCase();
        if (names.has(foldedName)) {
          invalidSchema(`Duplicate x-mcp-header '${annotation}'`);
        }
        names.add(foldedName);
        bindings.push({
          headerName: `Mcp-Param-${annotation}`,
          path: propertyPath,
          type: property.type,
        });
      }
      scanDisallowedAnnotations(property, true);
      visitProperties(property, propertyPath);
    }
  }

  visitProperties(tool.inputSchema, []);
  return bindings;
}

function valueAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) {
    const currentRecord = record(current);
    if (!currentRecord || !(segment in currentRecord)) return undefined;
    current = currentRecord[segment];
  }
  return current;
}

function matchesParameter(
  decoded: string,
  bodyValue: unknown,
  type: HeaderBinding["type"],
): boolean {
  if (type === "string")
    return typeof bodyValue === "string" && decoded === bodyValue;
  if (type === "boolean") {
    return typeof bodyValue === "boolean" && decoded === String(bodyValue);
  }
  const numeric = Number(decoded);
  return (
    typeof bodyValue === "number" &&
    Number.isSafeInteger(bodyValue) &&
    Number.isFinite(numeric) &&
    numeric === bodyValue
  );
}

function validateAccept(request: Request): void {
  const accepted = (request.headers.get("Accept") ?? "")
    .split(",")
    .map((part) => part.split(";", 1)[0]?.trim().toLowerCase());
  if (
    !accepted.includes("application/json") ||
    !accepted.includes("text/event-stream")
  ) {
    throw new McpProtocolError(
      JSONRPC_ERROR_CODES.INVALID_REQUEST,
      "Accept must include application/json and text/event-stream",
      406,
    );
  }
}

export function validateMcpHeaders(
  request: Request,
  message: JSONRPCRequest | Record<string, unknown>,
  tools: readonly Tool[],
): void {
  validateAccept(request);
  const params = record(message.params);
  const meta = record(params?._meta);
  const expectedVersion = meta?.[METADATA_KEYS.PROTOCOL_VERSION];
  const versionHeader = request.headers.get(MCP_HEADERS.PROTOCOL_VERSION);
  if (versionHeader === null || versionHeader !== expectedVersion) {
    headerMismatch(`${MCP_HEADERS.PROTOCOL_VERSION} does not match the body`);
  }

  const methodHeader = request.headers.get(MCP_HEADERS.METHOD);
  if (methodHeader === null || methodHeader !== message.method) {
    headerMismatch(`${MCP_HEADERS.METHOD} does not match the body`);
  }
  if (!IMPLEMENTED_MODERN_METHODS.has(message.method)) {
    throw new McpProtocolError(
      JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
      `Unknown method '${message.method}'`,
      404,
      { method: message.method },
    );
  }

  const nameField = NAMED_METHOD_FIELD[message.method];
  if (nameField) {
    const expectedName = params?.[nameField];
    const nameHeader = request.headers.get(MCP_HEADERS.NAME);
    if (
      typeof expectedName !== "string" ||
      nameHeader === null ||
      decodeMcpHeaderValue(nameHeader) !== expectedName
    ) {
      headerMismatch(`${MCP_HEADERS.NAME} does not match the body`);
    }
  }

  if (message.method !== MCP_METHODS.TOOLS_CALL) return;
  const toolName = params?.name;
  const tool = tools.find((candidate) => candidate.name === toolName);
  if (!tool) return;
  const args = params?.arguments;
  for (const binding of toolHeaderBindings(tool)) {
    const bodyValue = valueAtPath(args, binding.path);
    const rawHeader = request.headers.get(binding.headerName);
    if (bodyValue === undefined || bodyValue === null) {
      if (rawHeader !== null) {
        headerMismatch(`${binding.headerName} must be omitted`);
      }
      continue;
    }
    if (
      rawHeader === null ||
      !matchesParameter(
        decodeMcpHeaderValue(rawHeader),
        bodyValue,
        binding.type,
      )
    ) {
      headerMismatch(`${binding.headerName} does not match the body`);
    }
  }
}

export function modernCorsHeaders(
  tools: readonly Tool[],
): Readonly<Record<string, string>> {
  const headers = [
    "Accept",
    "Content-Type",
    "Authorization",
    MCP_HEADERS.PROTOCOL_VERSION,
    MCP_HEADERS.METHOD,
    MCP_HEADERS.NAME,
  ];
  const seen = new Set(headers.map((header) => header.toLowerCase()));
  for (const tool of tools) {
    for (const binding of toolHeaderBindings(tool)) {
      const folded = binding.headerName.toLowerCase();
      if (!seen.has(folded)) {
        seen.add(folded);
        headers.push(binding.headerName);
      }
    }
  }
  return { "Access-Control-Allow-Headers": headers.join(", ") };
}
