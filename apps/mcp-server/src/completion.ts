import type { CompleteResult } from "@modelcontextprotocol/server";
import { JSONRPC_ERROR_CODES } from "./protocol/constants.js";
import { McpProtocolError } from "./protocol/errors.js";
import { listPrompts, listResources } from "./registry.js";
import { RESOURCE_TEMPLATES } from "./resource-templates.js";

const PROMPT_ARGUMENT_VALUES: Readonly<Record<string, readonly string[]>> = {
  provider: ["aws", "gcp", "k8s"],
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function invalidCompletion(message: string, data?: unknown): never {
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    message,
    400,
    data,
  );
}

function result(values: string[]): CompleteResult {
  const limited = values.slice(0, 100);
  return {
    completion: {
      values: limited,
      total: values.length,
      hasMore: values.length > limited.length,
    },
  };
}

function completePromptArgument(
  ref: Record<string, unknown>,
  argument: Record<string, unknown>,
): CompleteResult {
  const name = ref.name;
  const argumentName = argument.name;
  const value = argument.value;
  if (
    typeof name !== "string" ||
    typeof argumentName !== "string" ||
    typeof value !== "string"
  ) {
    invalidCompletion("Invalid prompt completion parameters");
  }
  const prompt = listPrompts().find((candidate) => candidate.name === name);
  if (!prompt) invalidCompletion("Prompt not found", { name });
  if (!prompt.arguments?.some((candidate) => candidate.name === argumentName)) {
    invalidCompletion("Prompt argument not found", { name, argumentName });
  }
  const candidates = PROMPT_ARGUMENT_VALUES[argumentName] ?? [];
  return result(candidates.filter((candidate) => candidate.startsWith(value)));
}

function completeTemplateVariable(
  ref: Record<string, unknown>,
  argument: Record<string, unknown>,
): CompleteResult {
  const uriTemplate = ref.uri;
  const argumentName = argument.name;
  const value = argument.value;
  if (
    typeof uriTemplate !== "string" ||
    typeof argumentName !== "string" ||
    typeof value !== "string"
  ) {
    invalidCompletion("Invalid resource template completion parameters");
  }
  if (!RESOURCE_TEMPLATES.some((item) => item.uriTemplate === uriTemplate)) {
    invalidCompletion("Resource template not found", { uriTemplate });
  }

  const family =
    uriTemplate === "archlex://docs/{+path}" && argumentName === "path"
      ? "archlex://docs/"
      : uriTemplate === "archlex://examples/{name}" && argumentName === "name"
        ? "archlex://examples/"
        : undefined;
  if (!family) {
    invalidCompletion("Resource template variable not found", {
      uriTemplate,
      argumentName,
    });
  }
  const values = listResources()
    .map((resource) => resource.uri)
    .filter((uri) => uri.startsWith(family))
    .map((uri) => uri.slice(family.length))
    .filter((candidate) => candidate.startsWith(value))
    .sort();
  return result(values);
}

export function completeArgument(
  params: Record<string, unknown>,
): CompleteResult {
  const ref = record(params.ref);
  const argument = record(params.argument);
  if (!ref || !argument) invalidCompletion("Invalid completion parameters");
  if (ref.type === "ref/prompt") return completePromptArgument(ref, argument);
  if (ref.type === "ref/resource") {
    return completeTemplateVariable(ref, argument);
  }
  invalidCompletion("Unsupported completion reference", { type: ref.type });
}
