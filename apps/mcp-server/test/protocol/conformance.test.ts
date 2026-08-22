import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import worker from "../../src/index.js";
import {
  JSONRPC_ERROR_CODES,
  MCP_ERROR_CODES,
  MODERN_PROTOCOL_VERSION,
  SERVER_INFO,
} from "../../src/protocol/constants.js";

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
  options: {
    id?: string | number | null;
    nameHeader?: string;
    protocolVersion?: string;
    clientCapabilities?: Record<string, unknown>;
    headers?: Record<string, string>;
    overrideBody?: Record<string, unknown>;
  } = {},
): Request {
  const version = options.protocolVersion ?? MODERN_PROTOCOL_VERSION;
  const clientCapabilities = options.clientCapabilities ?? {};
  const body = options.overrideBody ?? {
    jsonrpc: "2.0",
    id: options.id === undefined ? "conf-req-1" : options.id,
    method,
    params: {
      ...params,
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: version,
        [CLIENT_CAPABILITIES_META_KEY]: clientCapabilities,
        ...(params._meta as Record<string, unknown> | undefined),
      },
    },
  };

  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": version,
    "Mcp-Method": method,
    ...options.headers,
  };

  if (options.nameHeader) {
    headers["Mcp-Name"] = options.nameHeader;
  }

  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("MCP 2026-07-28 Conformance Matrix", () => {
  describe("Method Conformance & Result Envelopes", () => {
    const conformanceCases = [
      {
        name: "server/discover",
        method: "server/discover",
        params: {},
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(result.supportedVersions).toEqual([MODERN_PROTOCOL_VERSION]);
          expect(result.capabilities).toBeDefined();
          expect(result.instructions).toBeDefined();
        },
      },
      {
        name: "tools/list",
        method: "tools/list",
        params: {},
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.tools)).toBe(true);
          const toolNames = (result.tools as { name: string }[]).map(
            (t) => t.name,
          );
          expect(toolNames).toContain("render_diagram");
          expect(toolNames).toContain("validate_diagram");
          expect(toolNames).toContain("get_cloud_catalog");
          expect(toolNames).toContain("generate_playground_url");
        },
      },
      {
        name: "tools/call (render_diagram)",
        method: "tools/call",
        nameHeader: "render_diagram",
        params: {
          name: "render_diagram",
          arguments: { source: 'app: ecs["Web API"]' },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(result.content).toBeDefined();
          expect(result.structuredContent).toBeDefined();
          expect(
            (result.structuredContent as Record<string, unknown>).success,
          ).toBe(true);
        },
      },
      {
        name: "tools/call (validate_diagram)",
        method: "tools/call",
        nameHeader: "validate_diagram",
        params: {
          name: "validate_diagram",
          arguments: { source: "direction LR\nprovider aws\nrds-proxy > rds" },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(result.content).toBeDefined();
          const parsed = JSON.parse(
            (result.content as { text: string }[])[0].text,
          );
          expect(parsed.valid).toBe(true);
        },
      },
      {
        name: "tools/call (get_cloud_catalog)",
        method: "tools/call",
        nameHeader: "get_cloud_catalog",
        params: {
          name: "get_cloud_catalog",
          arguments: { provider: "aws", query: "ecs" },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(result.content).toBeDefined();
          const parsed = JSON.parse(
            (result.content as { text: string }[])[0].text,
          );
          expect(parsed.provider).toBe("aws");
        },
      },
      {
        name: "tools/call (generate_playground_url)",
        method: "tools/call",
        nameHeader: "generate_playground_url",
        params: {
          name: "generate_playground_url",
          arguments: { source: "provider aws\necs" },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(result.content).toBeDefined();
          const parsed = JSON.parse(
            (result.content as { text: string }[])[0].text,
          );
          expect(parsed.url).toContain("playground.archlex.dev");
        },
      },
      {
        name: "resources/list",
        method: "resources/list",
        params: {},
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.resources)).toBe(true);
          const uris = (result.resources as { uri: string }[]).map(
            (r) => r.uri,
          );
          expect(uris).toContain("archlex://docs/specs/language");
          expect(uris).toContain("archlex://examples/k8s-microservices");
        },
      },
      {
        name: "resources/read (documentation)",
        method: "resources/read",
        nameHeader: "archlex://docs/specs/language",
        params: { uri: "archlex://docs/specs/language" },
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.contents)).toBe(true);
          const content = (result.contents as { text: string }[])[0];
          expect(content.text).toContain("ArchLex");
        },
      },
      {
        name: "resources/read (k8s example)",
        method: "resources/read",
        nameHeader: "archlex://examples/k8s-microservices",
        params: { uri: "archlex://examples/k8s-microservices" },
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.contents)).toBe(true);
          const content = (result.contents as { text: string }[])[0];
          expect(content.text).toMatch(/provider k8s/);
        },
      },
      {
        name: "resources/read (mcp app ui)",
        method: "resources/read",
        nameHeader: "ui://archlex/diagram-viewer",
        params: { uri: "ui://archlex/diagram-viewer" },
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.contents)).toBe(true);
          const content = (
            result.contents as { mimeType: string; text: string }[]
          )[0];
          expect(content.mimeType).toBe("text/html;profile=mcp-app");
          expect(content.text).toContain("<!DOCTYPE html>");
        },
      },
      {
        name: "resources/templates/list",
        method: "resources/templates/list",
        params: {},
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.resourceTemplates)).toBe(true);
          const templates = (
            result.resourceTemplates as { uriTemplate: string }[]
          ).map((t) => t.uriTemplate);
          expect(templates).toContain("archlex://docs/{+path}");
          expect(templates).toContain("archlex://examples/{name}");
        },
      },
      {
        name: "prompts/list",
        method: "prompts/list",
        params: {},
        cacheable: true,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.prompts)).toBe(true);
          const promptNames = (result.prompts as { name: string }[]).map(
            (p) => p.name,
          );
          expect(promptNames).toContain("architect_cloud_infrastructure");
        },
      },
      {
        name: "prompts/get",
        method: "prompts/get",
        nameHeader: "architect_cloud_infrastructure",
        params: {
          name: "architect_cloud_infrastructure",
          arguments: { provider: "aws", requirements: "Build a 3-tier app" },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(Array.isArray(result.messages)).toBe(true);
          const messages = result.messages as {
            role: string;
            content: { text: string };
          }[];
          expect(messages[0].role).toBe("user");
          expect(messages[0].content.text).toContain("Cloud Architect");
        },
      },
      {
        name: "completion/complete (prompt argument)",
        method: "completion/complete",
        params: {
          ref: {
            type: "ref/prompt",
            name: "architect_cloud_infrastructure",
          },
          argument: { name: "provider", value: "aw" },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(result.completion).toBeDefined();
          const completion = result.completion as { values: string[] };
          expect(completion.values).toContain("aws");
        },
      },
      {
        name: "completion/complete (resource template variable)",
        method: "completion/complete",
        params: {
          ref: {
            type: "ref/resource",
            uri: "archlex://docs/{+path}",
          },
          argument: { name: "path", value: "sp" },
        },
        cacheable: false,
        validateResult(result: Record<string, unknown>) {
          expect(result.completion).toBeDefined();
          const completion = result.completion as { values: string[] };
          expect(completion.values).toContain("specs/language");
        },
      },
    ];

    for (const testCase of conformanceCases) {
      it(`executes ${testCase.name} with standard 2026 envelope and metadata`, async () => {
        const req = modernRequest(testCase.method, testCase.params, {
          nameHeader: testCase.nameHeader,
        });
        const res = await worker.fetch(req);
        expect(res.status).toBe(200);

        const data = (await res.json()) as {
          jsonrpc: string;
          id: string | number;
          result: Record<string, unknown>;
        };

        expect(data.jsonrpc).toBe("2.0");
        expect(data.id).toBe("conf-req-1");
        expect(data.result).toBeDefined();

        // 1. Result type must be 'complete'
        expect(data.result.resultType).toBe("complete");

        // 2. Server identity metadata must be present
        const meta = data.result._meta as Record<string, unknown> | undefined;
        expect(meta).toBeDefined();
        expect(meta?.["io.modelcontextprotocol/serverInfo"]).toEqual(
          expect.objectContaining({
            name: SERVER_INFO.name,
          }),
        );

        // 3. Cache hints validation
        if (testCase.cacheable) {
          expect(data.result.ttlMs).toBe(3600000);
          expect(data.result.cacheScope).toBe("public");
        }

        // 4. Case-specific result verification
        testCase.validateResult(data.result);
      });
    }
  });

  describe("Capabilities Contract in server/discover", () => {
    it("advertises exact matching capabilities without unsupported flags", async () => {
      const req = modernRequest("server/discover");
      const res = await worker.fetch(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        result: {
          capabilities: Record<string, unknown>;
          supportedVersions: string[];
        };
      };

      const { capabilities, supportedVersions } = data.result;

      // Supported version matches exactly
      expect(supportedVersions).toEqual(["2026-07-28"]);

      // Tools capability
      expect(capabilities.tools).toEqual({});

      // Resources capability declares no list-change / subscribe flags since no push events exist
      expect(capabilities.resources).toEqual({});

      // Prompts capability
      expect(capabilities.prompts).toEqual({});

      // Completions capability
      expect(capabilities.completions).toEqual({});

      // Prohibited modern features MUST NOT be advertised
      expect(capabilities.logging).toBeUndefined();
      expect("protocolVersion" in data.result).toBe(false);
    });
  });

  describe("Error Conformance Matrix", () => {
    it("returns -32700 Parse Error (400) for malformed JSON", async () => {
      const req = new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
          "Mcp-Method": "server/discover",
        },
        body: "invalid json {",
      });
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.PARSE_ERROR);
    });

    it("returns -32600 Invalid Request (400) for null ID", async () => {
      const req = modernRequest("server/discover", {}, { id: null });
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_REQUEST);
    });

    it("returns -32600 Invalid Request (400) for missing jsonrpc version", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          overrideBody: {
            id: 1,
            method: "server/discover",
            params: {
              _meta: {
                [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
                [CLIENT_CAPABILITIES_META_KEY]: {},
              },
            },
          },
        },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_REQUEST);
    });

    it("returns -32602 Invalid Params (400) for missing protocolVersion in _meta", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          overrideBody: {
            jsonrpc: "2.0",
            id: 1,
            method: "server/discover",
            params: {
              _meta: {
                [CLIENT_CAPABILITIES_META_KEY]: {},
              },
            },
          },
        },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain("protocolVersion");
    });

    it("returns -32602 Invalid Params (400) for missing clientCapabilities in _meta", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          overrideBody: {
            jsonrpc: "2.0",
            id: 1,
            method: "server/discover",
            params: {
              _meta: {
                [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              },
            },
          },
        },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain("clientCapabilities");
    });

    it("returns -32602 Invalid Params (400) for unexpected parameter in server/discover", async () => {
      const req = modernRequest("server/discover", { unexpected: "param" });
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain(
        "server/discover accepts no method-specific parameters",
      );
    });

    it("returns -32602 Invalid Params (400) for non-existent tool", async () => {
      const req = modernRequest(
        "tools/call",
        { name: "non_existent_tool", arguments: {} },
        { nameHeader: "non_existent_tool" },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain("Tool not found");
    });

    it("returns -32602 Invalid Params (400) for non-existent resource URI", async () => {
      const req = modernRequest(
        "resources/read",
        { uri: "archlex://docs/non-existent" },
        { nameHeader: "archlex://docs/non-existent" },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain("Resource not found");
    });

    it("returns -32602 Invalid Params (400) for non-existent prompt", async () => {
      const req = modernRequest(
        "prompts/get",
        { name: "unknown_prompt", arguments: {} },
        { nameHeader: "unknown_prompt" },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain("Prompt not found");
    });

    it("returns -32602 Invalid Params (400) for missing required prompt arguments", async () => {
      const req = modernRequest(
        "prompts/get",
        { name: "architect_cloud_infrastructure", arguments: {} },
        { nameHeader: "architect_cloud_infrastructure" },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.INVALID_PARAMS);
      expect(data.error.message).toContain("Missing required prompt argument");
    });

    it("returns -32601 Method Not Found (404) for unknown methods", async () => {
      const req = modernRequest(
        "unknown/customMethod",
        {},
        {
          headers: { "Mcp-Method": "unknown/customMethod" },
        },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(404);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(JSONRPC_ERROR_CODES.METHOD_NOT_FOUND);
    });

    it("returns -32022 Unsupported Protocol Version (400) with supported and requested versions", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          protocolVersion: "2024-11-05",
        },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: {
          code: number;
          message: string;
          data: { supported: string[]; requested: string };
        };
      };
      expect(data.error.code).toBe(
        MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION,
      );
      expect(data.error.data.supported).toEqual(["2026-07-28"]);
      expect(data.error.data.requested).toBe("2024-11-05");
    });

    it("returns -32020 Header Mismatch (400) for missing MCP-Protocol-Version header", async () => {
      const req = modernRequest("server/discover");
      const headers = new Headers(req.headers);
      headers.delete("MCP-Protocol-Version");
      const strippedReq = new Request(req.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
          params: {
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        }),
      });
      const res = await worker.fetch(strippedReq);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(MCP_ERROR_CODES.HEADER_MISMATCH);
    });

    it("returns -32020 Header Mismatch (400) for missing Mcp-Method header", async () => {
      const req = modernRequest("server/discover");
      const headers = new Headers(req.headers);
      headers.delete("Mcp-Method");
      const strippedReq = new Request(req.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
          params: {
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        }),
      });
      const res = await worker.fetch(strippedReq);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(MCP_ERROR_CODES.HEADER_MISMATCH);
    });

    it("returns -32020 Header Mismatch (400) for missing Mcp-Name header on tools/call", async () => {
      const req = modernRequest("tools/call", {
        name: "render_diagram",
        arguments: { source: "provider aws\necs" },
      });
      // Do not set Mcp-Name header
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(MCP_ERROR_CODES.HEADER_MISMATCH);
    });

    it("returns -32020 Header Mismatch (400) for mismatched Mcp-Name header on resources/read", async () => {
      const req = modernRequest(
        "resources/read",
        { uri: "archlex://docs/specs/language" },
        { nameHeader: "archlex://docs/specs/other" },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: number; message: string };
      };
      expect(data.error.code).toBe(MCP_ERROR_CODES.HEADER_MISMATCH);
    });

    it("returns 406 for incompatible Accept header", async () => {
      const req = modernRequest(
        "server/discover",
        {},
        {
          headers: { Accept: "application/json" }, // missing text/event-stream
        },
      );
      const res = await worker.fetch(req);
      expect(res.status).toBe(406);
    });
  });

  describe("Statelessness & Session Isolation", () => {
    it("processes independent requests without session IDs or shared state", async () => {
      const requests = [
        modernRequest("server/discover", {}, { id: 101 }),
        modernRequest("tools/list", {}, { id: 102 }),
        modernRequest(
          "resources/read",
          { uri: "archlex://docs/specs/language" },
          { id: 103, nameHeader: "archlex://docs/specs/language" },
        ),
      ];

      for (const req of requests) {
        const res = await worker.fetch(req);
        expect(res.status).toBe(200);

        // Never returns Mcp-Session-Id in modern responses
        expect(res.headers.get("Mcp-Session-Id")).toBeNull();
        expect(res.headers.get("Set-Cookie")).toBeNull();
      }
    });

    it("handles concurrent unrelated requests statelessly", async () => {
      const calls = Array.from({ length: 5 }, (_, index) =>
        worker.fetch(
          modernRequest(
            "tools/call",
            {
              name: "validate_diagram",
              arguments: { source: `provider aws\nnode${index}: ecs` },
            },
            {
              id: `concurrent-${index}`,
              nameHeader: "validate_diagram",
            },
          ),
        ),
      );

      const responses = await Promise.all(calls);
      for (const [index, res] of responses.entries()) {
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
          id: string;
          result: { resultType: string };
        };
        expect(data.id).toBe(`concurrent-${index}`);
        expect(data.result.resultType).toBe("complete");
      }
    });
  });
});
