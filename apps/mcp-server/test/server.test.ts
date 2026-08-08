import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import { handleGetCatalog } from "../src/tools/catalog.js";
import { handleGeneratePlaygroundUrl } from "../src/tools/playground.js";
import { handleRenderDiagram } from "../src/tools/render.js";
import { handleValidateDiagram } from "../src/tools/validate.js";

describe("ArchLex MCP Server Tools", () => {
  describe("render_diagram", () => {
    it("renders valid ArchLex DSL to SVG with diagnostics and playground URL", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds > ecs";
      const result = await handleRenderDiagram({ source, theme: "dark" });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("image");
      expect(result.content[0].mimeType).toBe("image/svg+xml");
      const textContent = result.content[1];
      expect(textContent.type).toBe("text");
      if (textContent.type !== "text") throw new Error("Expected text content");

      const payload = JSON.parse(textContent.text);
      expect(payload.success).toBe(true);
      expect(payload.svg).toContain("<svg");
      expect(payload.playground_url).toContain(
        "https://playground.archlex.dev/",
      );
      expect(payload.nodes_count).toBeGreaterThan(0);
    });

    it("returns error diagnostics for invalid syntax", async () => {
      const source = "provider aws\ninvalid -> -> syntax";
      const result = await handleRenderDiagram({ source });
      const textContent = result.content[1];
      if (textContent.type !== "text") throw new Error("Expected text content");
      const payload = JSON.parse(textContent.text);

      expect(payload.diagnostics.length).toBeGreaterThan(0);
    });

    it("includes structuredContent mirroring the text payload", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds > ecs";
      const result = await handleRenderDiagram({ source, theme: "dark" });
      const textContent = result.content[1];
      if (textContent.type !== "text") throw new Error("Expected text content");

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent).toEqual(JSON.parse(textContent.text));
      expect((result.structuredContent as { svg: string }).svg).toContain(
        "<svg",
      );
    });
  });

  describe("MCP Apps (ui extension)", () => {
    it("declares ui resource metadata on render_diagram via tools/list", async () => {
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/list",
        }),
      });

      const response = await worker.fetch(request);
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        result: {
          tools: {
            name: string;
            outputSchema?: { type: string };
            _meta?: { ui?: { resourceUri?: string } };
          }[];
        };
      };

      const renderTool = data.result.tools.find(
        (t) => t.name === "render_diagram",
      );
      expect(renderTool).toBeDefined();
      expect(renderTool?._meta?.ui?.resourceUri).toBe(
        "ui://archlex/diagram-viewer",
      );
      expect(renderTool?.outputSchema?.type).toBe("object");
    });

    it("serves the diagram viewer HTML as an MCP Apps ui:// resource", async () => {
      const listReq = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 11,
          method: "resources/list",
        }),
      });

      const listRes = await worker.fetch(listReq);
      const listData = (await listRes.json()) as {
        result: { resources: { uri: string; mimeType?: string }[] };
      };
      const viewerResource = listData.result.resources.find(
        (r) => r.uri === "ui://archlex/diagram-viewer",
      );
      expect(viewerResource).toBeDefined();
      expect(viewerResource?.mimeType).toBe("text/html;profile=mcp-app");

      const readReq = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 12,
          method: "resources/read",
          params: { uri: "ui://archlex/diagram-viewer" },
        }),
      });

      const readRes = await worker.fetch(readReq);
      expect(readRes.status).toBe(200);
      const readData = (await readRes.json()) as {
        result: {
          contents: { uri: string; mimeType?: string; text?: string }[];
        };
      };
      const content = readData.result.contents[0];
      expect(content.mimeType).toBe("text/html;profile=mcp-app");
      expect(content.text).toContain("<!DOCTYPE html>");
      expect(content.text).toContain("ui/initialize");
      expect(content.text).toContain("ui/notifications/tool-result");
    });
  });

  describe("validate_diagram", () => {
    it("validates ArchLex DSL without rendering full SVG", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds";
      const result = await handleValidateDiagram({ source });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.valid).toBe(true);
      expect(payload.error_count).toBe(0);
    });
  });

  describe("get_cloud_catalog", () => {
    it("returns supported providers, services, and relationship kinds", async () => {
      const result = await handleGetCatalog({ provider: "all" });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.providers.aws).toBeDefined();
      expect(payload.providers.aws.services.length).toBeGreaterThan(100);
      expect(payload.providers.gcp).toBeDefined();
      expect(payload.providers.gcp.services.length).toBeGreaterThan(100);
      expect(payload.relationshipKinds).toContain("connects");
      expect(payload.containmentScopes).toContain("vpc");
    });
  });

  describe("generate_playground_url", () => {
    it("generates a deep link to playground with encoded source", async () => {
      const source = "direction LR\nprovider gcp\n\ngke > cloud-sql";
      const result = await handleGeneratePlaygroundUrl({ source });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.url).toContain("playground.archlex.dev");
      expect(payload.url).toContain(encodeURIComponent(source));
    });
  });

  describe("HTTP Server Stateless Endpoint", () => {
    it("handles tools/list request via POST /messages fallback", async () => {
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
      });

      const response = await worker.fetch(request);
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        result: { tools: unknown[] };
      };
      expect(data.result.tools.length).toBe(4);
    });

    it("serves synced documentation resources via resources/list and resources/read", async () => {
      const listReq = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/list",
        }),
      });

      const listRes = await worker.fetch(listReq);
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()) as {
        result: { resources: { uri: string; name: string }[] };
      };

      const docUris = listData.result.resources.map((r) => r.uri);
      expect(docUris).toContain("archlex://docs/specs/language");
      expect(docUris).toContain("archlex://docs/specs/aws-semantics");
      expect(docUris).toContain("archlex://docs/errors/AL-PARSE-001");

      const readReq = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "resources/read",
          params: {
            uri: "archlex://docs/specs/language",
          },
        }),
      });

      const readRes = await worker.fetch(readReq);
      expect(readRes.status).toBe(200);
      const readData = (await readRes.json()) as {
        result: { contents: { text: string }[] };
      };
      expect(readData.result.contents[0].text).toContain("ArchLex");
    });
  });
});

describe("Streamable HTTP endpoint", () => {
  const protocolVersion = "2025-03-26";

  function mcpRequest(body: unknown, method = "POST"): Request {
    return new Request("https://mcp.archlex.dev/mcp", {
      method,
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": protocolVersion,
        Origin: "https://archlex.dev",
      },
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
  }

  it("initializes through POST /mcp", async () => {
    const response = await worker.fetch(
      mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion,
          capabilities: {},
          clientInfo: { name: "archlex-test", version: "1.0.0" },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const data = (await response.json()) as {
      result: { protocolVersion: string; serverInfo: { name: string } };
    };
    expect(data.result.protocolVersion).toBe(protocolVersion);
    expect(data.result.serverInfo.name).toBe("archlex-mcp-server");
  });

  it("lists the four tools through stateless POST /mcp", async () => {
    const response = await worker.fetch(
      mcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    const data = (await response.json()) as {
      result: { tools: { name: string }[] };
    };

    expect(data.result.tools.map((tool) => tool.name)).toEqual([
      "render_diagram",
      "validate_diagram",
      "get_cloud_catalog",
      "generate_playground_url",
    ]);
  });

  it("advertises the current and compatibility endpoints", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/info"),
    );
    const data = (await response.json()) as Record<string, unknown>;

    expect(data.streamable_http_endpoint).toBe("/mcp");
    expect(data.sse_endpoint).toBe("/sse");
    expect(data.messages_endpoint).toBe("/messages");
  });

  it.each([
    {
      name: "invalid origin",
      request: new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      env: { ALLOWED_ORIGINS: "https://archlex.dev" },
      status: 403,
    },
    {
      name: "missing bearer token",
      request: new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      env: { MCP_AUTH_TOKEN: "secret" },
      status: 401,
    },
  ])("rejects $name before MCP dispatch", async ({ request, env, status }) => {
    expect((await worker.fetch(request, env)).status).toBe(status);
  });

  it("rejects oversized /mcp payloads", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "524289",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(413);
  });

  it("rejects unsupported /mcp methods through the protocol transport", async () => {
    const response = await worker.fetch(mcpRequest(undefined, "PUT"));
    expect(response.status).toBe(405);
  });
});
