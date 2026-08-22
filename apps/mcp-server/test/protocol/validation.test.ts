import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import {
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "../../src/protocol/constants.js";

function modernRequest(meta: Record<string, unknown>) {
  return {
    jsonrpc: "2.0",
    id: "request-1",
    method: "server/discover",
    params: { _meta: meta },
  };
}

describe("modern request validation", () => {
  test("returns request-scoped protocol context from valid metadata", async () => {
    const { validateModernRequest } = await import(
      "../../src/protocol/validation.js"
    );
    const context = validateModernRequest(
      modernRequest({
        [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
        [CLIENT_CAPABILITIES_META_KEY]: { elicitation: {} },
        [CLIENT_INFO_META_KEY]: { name: "test-client", version: "1.0.0" },
        progressToken: 7,
      }),
    );
    expect(context).toEqual({
      protocolVersion: MODERN_PROTOCOL_VERSION,
      clientCapabilities: { elicitation: { form: {} } },
      clientInfo: { name: "test-client", version: "1.0.0" },
      progressToken: 7,
      requestId: "request-1",
    });
  });

  test.each([
    ["protocol version", { [CLIENT_CAPABILITIES_META_KEY]: {} }],
    [
      "client capabilities",
      { [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION },
    ],
  ])("rejects missing required %s metadata", async (_name, meta) => {
    const { validateModernRequest } = await import(
      "../../src/protocol/validation.js"
    );
    expect(() => validateModernRequest(modernRequest(meta))).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
        httpStatus: 400,
      }),
    );
  });

  test("returns the requested and supported versions for an unsupported revision", async () => {
    const { validateModernRequest } = await import(
      "../../src/protocol/validation.js"
    );
    expect(() =>
      validateModernRequest(
        modernRequest({
          [PROTOCOL_VERSION_META_KEY]: "2099-01-01",
          [CLIENT_CAPABILITIES_META_KEY]: {},
        }),
      ),
    ).toThrow(
      expect.objectContaining({
        code: MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION,
        httpStatus: 400,
        data: {
          requested: "2099-01-01",
          supported: [...SUPPORTED_PROTOCOL_VERSIONS],
        },
      }),
    );
  });

  test("rejects malformed capabilities and client identity", async () => {
    const { validateModernRequest } = await import(
      "../../src/protocol/validation.js"
    );
    for (const meta of [
      {
        [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
        [CLIENT_CAPABILITIES_META_KEY]: "tools",
      },
      {
        [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
        [CLIENT_CAPABILITIES_META_KEY]: {},
        [CLIENT_INFO_META_KEY]: { name: "missing-version" },
      },
    ]) {
      expect(() => validateModernRequest(modernRequest(meta))).toThrow(
        expect.objectContaining({ code: JSONRPC_ERROR_CODES.INVALID_PARAMS }),
      );
    }
  });

  test("reports every missing nested capability path", async () => {
    const { requireClientCapabilities, validateModernRequest } = await import(
      "../../src/protocol/validation.js"
    );
    const context = validateModernRequest(
      modernRequest({
        [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
        [CLIENT_CAPABILITIES_META_KEY]: {},
      }),
    );
    expect(() =>
      requireClientCapabilities(context, ["elicitation.form", "sampling"]),
    ).toThrow(
      expect.objectContaining({
        code: MCP_ERROR_CODES.MISSING_REQUIRED_CLIENT_CAPABILITY,
        data: {
          requiredCapabilities: {
            elicitation: { form: {} },
            sampling: {},
          },
        },
      }),
    );
  });
});

describe("JSON Schema dialect validation", () => {
  test("accepts valid JSON Schema 2020-12 with or without an explicit dialect", async () => {
    const { validateJsonSchema } = await import(
      "../../src/protocol/validation.js"
    );
    expect(() => validateJsonSchema({ type: "object" })).not.toThrow();
    expect(() =>
      validateJsonSchema({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
      }),
    ).not.toThrow();
  });

  test("rejects unsupported dialects and validates values with 2020-12 semantics", async () => {
    const { validateJsonSchema } = await import(
      "../../src/protocol/validation.js"
    );
    expect(() =>
      validateJsonSchema({
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
      }),
    ).toThrow(
      expect.objectContaining({
        code: JSONRPC_ERROR_CODES.INVALID_PARAMS,
        httpStatus: 400,
      }),
    );
    expect(() => validateJsonSchema({ type: "object" }, [])).toThrow(
      expect.objectContaining({ code: JSONRPC_ERROR_CODES.INVALID_PARAMS }),
    );
    expect(() => validateJsonSchema({ type: "object" }, {})).not.toThrow();
  });
});
