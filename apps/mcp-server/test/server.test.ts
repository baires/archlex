import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { IconLoader, SanitizedIcon } from "@archlex/icons-core";
import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import { handleGetCatalog } from "../src/tools/catalog.js";
import { handleGeneratePlaygroundUrl } from "../src/tools/playground.js";
import {
  fetchIconInWorker,
  handleRenderDiagram,
  rasterizeSvg,
} from "../src/tools/render.js";
import { handleValidateDiagram } from "../src/tools/validate.js";

const CODEBUILD_ICON: SanitizedIcon = {
  provider: "aws",
  key: "codebuild",
  checksum: "sha256:test-codebuild",
  viewBox: "0 0 64 64",
  svgFragment:
    '<svg viewBox="0 0 64 64"><path fill="#ff00aa" d="M0 0h64v64H0z"/></svg>',
};

const codebuildIconLoader: IconLoader = {
  async loadIcons() {
    return {
      icons: new Map([["aws:codebuild", CODEBUILD_ICON]]),
      diagnostics: [],
    };
  },
};

describe("ArchLex MCP Server Tools", () => {
  describe("render_diagram", () => {
    it("adapts redirect-error icon fetches for Cloudflare Workers", async () => {
      let receivedRedirect: RequestRedirect | undefined;
      const response = await fetchIconInWorker(
        "https://unpkg.com/icon.svg",
        { redirect: "error" },
        async (_input, init) => {
          receivedRedirect = init?.redirect;
          return new Response("<svg/>", { status: 200 });
        },
      );

      expect(response.status).toBe(200);
      expect(receivedRedirect).toBe("manual");
    });

    it("returns the exact ArchLex source after a successful render", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds > ecs";
      const result = await handleRenderDiagram({ source, theme: "dark" });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("image");

      const textContent = result.content[1];
      expect(textContent.type).toBe("text");
      if (textContent.type !== "text") throw new Error("Expected text content");

      expect(textContent.text).toMatch(
        /^✓ Rendered successfully: \d+ nodes?, \d+ edges?/,
      );
      expect(
        textContent.text.endsWith(`\n\n\`\`\`archlex\n${source}\n\`\`\``),
      ).toBe(true);
    });

    it("returns minimal text summary for error case", async () => {
      const source = "provider aws\ninvalid -> -> syntax";
      const result = await handleRenderDiagram({ source });
      const textContent = result.content[1];
      if (textContent.type !== "text") throw new Error("Expected text content");

      expect(textContent.text).toMatch(
        /^✗ Rendering failed: \d+ errors?\n\n```archlex\n/,
      );
      expect(textContent.text.endsWith(`${source}\n\`\`\``)).toBe(true);
      expect(textContent.text).not.toContain("{");
    });

    it("uses a safe Markdown fence when source contains backticks", async () => {
      const source = 'provider aws\napp: ecs["```"]';
      const result = await handleRenderDiagram({ source });
      const textContent = result.content[1];
      if (textContent.type !== "text") throw new Error("Expected text content");

      expect(textContent.text).toContain(
        `\n\n\`\`\`\`archlex\n${source}\n\`\`\`\``,
      );
    });

    it("includes complete structuredContent with all metadata", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds > ecs";
      const result = await handleRenderDiagram({ source, theme: "dark" });

      expect(result.structuredContent).toBeDefined();
      const structured = result.structuredContent as Record<string, unknown>;

      // All required fields present
      expect(structured.success).toBe(true);
      expect(structured.svg).toBeUndefined();
      expect(structured.source).toBe(source);
      expect(structured.diagnostics).toBeDefined();
      expect(Array.isArray(structured.diagnostics)).toBe(true);
      expect(structured.playground_url).toBeDefined();
      expect(structured.playground_url as string).toContain(
        "https://playground.archlex.dev/",
      );
      expect(structured.nodes_count).toBeDefined();
      expect(typeof structured.nodes_count).toBe("number");
      expect(structured.nodes_count).toBeGreaterThan(0);
      expect(structured.edges_count).toBeDefined();
      expect(typeof structured.edges_count).toBe("number");
    });

    it("returns a decodable PNG image for direct MCP clients", async () => {
      const source = "direction LR\nprovider aws\n\necs";
      const result = await handleRenderDiagram({ source });

      const imageContent = result.content[0];
      expect(imageContent.type).toBe("image");
      if (imageContent.type !== "image")
        throw new Error("Expected image content");

      expect(imageContent.data).toBeDefined();
      expect(typeof imageContent.data).toBe("string");
      expect(imageContent.mimeType).toBe("image/png");

      const decoded = Buffer.from(imageContent.data, "base64");
      expect([...decoded.subarray(0, 8)]).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    });

    it("rasterizes node labels instead of dropping text", async () => {
      const font = await readFile(
        createRequire(import.meta.url).resolve(
          "inter-font/ttf/Inter-Regular.ttf",
        ),
      );
      const withText = await rasterizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="10" y="45" fill="black" font-family="system-ui, sans-serif" font-size="32">HELLO</text></svg>',
        [font],
      );
      const withoutText = await rasterizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"></svg>',
        [font],
      );

      expect(Buffer.from(withText).equals(Buffer.from(withoutText))).toBe(
        false,
      );
    });

    it.each(["LR", "TB"] as const)(
      "bounds %s raster dimensions for large valid diagrams",
      async (direction) => {
        const declarations = Array.from(
          { length: 60 },
          (_, index) => `node${index}: ecs["Node ${index}"]`,
        );
        const relationships = Array.from(
          { length: 59 },
          (_, index) => `node${index} -> node${index + 1}`,
        );
        const source = ["provider aws", ...declarations, ...relationships].join(
          "\n",
        );
        const result = await handleRenderDiagram({ source, direction });
        const imageContent = result.content[0];
        if (imageContent.type !== "image")
          throw new Error("Expected image content");
        const png = Buffer.from(imageContent.data, "base64");
        const width = png.readUInt32BE(16);
        const height = png.readUInt32BE(20);

        expect(width).toBeLessThanOrEqual(4096);
        expect(height).toBeLessThanOrEqual(4096);
        expect(width * height).toBeLessThanOrEqual(4_000_000);
      },
    );

    it("hydrates unresolved catalog icons before rendering", async () => {
      const source = 'provider aws\nbuild: codebuild["Build and test"]';
      const result = await handleRenderDiagram(
        { source },
        { enableMcpApps: true, iconLoader: codebuildIconLoader },
      );
      const structured = result.structuredContent as Record<string, unknown>;

      expect(structured.svg).toContain('data-archlex-icon="aws.codebuild"');
      expect(structured.svg).toContain("#ff00aa");
      const recoloredPng = await rasterizeSvg(
        String(structured.svg).replace("#ff00aa", "#00ffaa"),
      );
      expect(result.content[0].data).not.toBe(
        Buffer.from(recoloredPng).toString("base64"),
      );
    });

    it("falls back before a stalled icon loader exceeds its deadline", async () => {
      const stalledLoader: IconLoader = {
        loadIcons(_requests, options) {
          return new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          });
        },
      };
      const render = handleRenderDiagram(
        { source: "provider aws\nbuild: codebuild" },
        {
          enableMcpApps: true,
          iconLoader: stalledLoader,
          iconHydrationTimeoutMs: 10,
        },
      );
      const outcome = await Promise.race([
        render,
        new Promise<"timed-out">((resolve) =>
          setTimeout(() => resolve("timed-out"), 100),
        ),
      ]);

      expect(outcome).not.toBe("timed-out");
      expect(outcome).toMatchObject({ structuredContent: { success: true } });
    });

    it("returns SVG text without rasterizing when format is svg", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds > ecs";
      const result = await handleRenderDiagram({ source, format: "svg" });

      expect(result.content.every((block) => block.type === "text")).toBe(true);

      const summary = result.content[0];
      if (summary.type !== "text") throw new Error("Expected text content");
      expect(summary.text).toMatch(/^✓ Rendered successfully:/);

      const svgBlock = result.content[1];
      if (svgBlock.type !== "text") throw new Error("Expected text content");
      expect(svgBlock.text).toContain("<svg");

      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured.success).toBe(true);
      expect(structured.svg).toBe(svgBlock.text);
    });
  });

  describe("MCP Apps (ui extension)", () => {
    it("includes MCP Apps metadata when ENABLE_MCP_APPS is true", async () => {
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/list",
        }),
      });

      const response = await worker.fetch(request, { ENABLE_MCP_APPS: "true" });
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        result: {
          tools: {
            name: string;
            description?: string;
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

      // Verify strengthened tool description (ticket #29)
      expect(renderTool?.description).toContain("Display the image inline");
      expect(renderTool?.description).toContain(
        "do not show raw SVG source code",
      );
      expect(renderTool?.description).toContain(
        "The image is the primary output",
      );
      expect(renderTool?.description).not.toContain("SHOULD");
    });

    it("returns SVG data required by the MCP Apps viewer", async () => {
      const source = "provider aws\necs";
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 15,
          method: "tools/call",
          params: {
            name: "render_diagram",
            arguments: { source },
          },
        }),
      });

      const response = await worker.fetch(request, { ENABLE_MCP_APPS: "true" });
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        result: { structuredContent?: Record<string, unknown> };
      };

      expect(data.result.structuredContent?.svg).toMatch(/^<svg/);
      expect(data.result.structuredContent?.source).toBe(source);
    });

    it("omits MCP Apps metadata when ENABLE_MCP_APPS is false", async () => {
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/list",
        }),
      });

      // Call with env where ENABLE_MCP_APPS is explicitly "false" (default)
      const response = await worker.fetch(request, {
        ENABLE_MCP_APPS: "false",
      });
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        result: {
          tools: {
            name: string;
            _meta?: { ui?: { resourceUri?: string } };
          }[];
        };
      };

      const renderTool = data.result.tools.find(
        (t) => t.name === "render_diagram",
      );
      expect(renderTool).toBeDefined();
      expect(renderTool?._meta).toBeUndefined();
    });

    it("includes MCP Apps metadata when ENABLE_MCP_APPS is true", async () => {
      const request = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/list",
        }),
      });

      // Call with env where ENABLE_MCP_APPS is explicitly "true"
      const response = await worker.fetch(request, { ENABLE_MCP_APPS: "true" });
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        result: {
          tools: {
            name: string;
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

    it("serves diagram viewer resource regardless of ENABLE_MCP_APPS flag", async () => {
      // Test with flag OFF
      const listReqOff = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 13,
          method: "resources/list",
        }),
      });

      const listResOff = await worker.fetch(listReqOff, {
        ENABLE_MCP_APPS: "false",
      });
      const listDataOff = (await listResOff.json()) as {
        result: { resources: { uri: string }[] };
      };
      const viewerResourceOff = listDataOff.result.resources.find(
        (r) => r.uri === "ui://archlex/diagram-viewer",
      );
      expect(viewerResourceOff).toBeDefined();

      // Test with flag ON
      const listReqOn = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 14,
          method: "resources/list",
        }),
      });

      const listResOn = await worker.fetch(listReqOn, {
        ENABLE_MCP_APPS: "true",
      });
      const listDataOn = (await listResOn.json()) as {
        result: { resources: { uri: string }[] };
      };
      const viewerResourceOn = listDataOn.result.resources.find(
        (r) => r.uri === "ui://archlex/diagram-viewer",
      );
      expect(viewerResourceOn).toBeDefined();
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

    it("validates Kubernetes diagrams", async () => {
      const source = `provider k8s
cluster production {
  namespace web {
    api: deployment
  }
}`;
      const result = await handleValidateDiagram({ source, provider: "k8s" });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.error_count).toBe(0);
      expect(payload.nodes_count).toBe(1);
    });

    it("includes a remediation hint when the source has parse errors", async () => {
      const source = "provider aws\ncloudfront -[serves static]-> s3";
      const result = await handleValidateDiagram({ source });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.valid).toBe(false);
      expect(payload.error_count).toBeGreaterThan(0);
      expect(payload.hint).toContain("-[writes]->");
      expect(payload.hint).toContain("|");
    });

    it("omits the hint when the source parses cleanly", async () => {
      const source = "direction LR\nprovider aws\n\nrds-proxy > rds";
      const result = await handleValidateDiagram({ source });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.valid).toBe(true);
      expect(payload.hint).toBeUndefined();
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
      expect(payload.providers.k8s).toBeDefined();
      expect(payload.providers.k8s.services.length).toBeGreaterThanOrEqual(60);
      expect(payload.relationshipKinds).toContain("connects");
      expect(payload.containmentScopes).toContain("vpc");
      expect(payload.containmentScopes).toContain("namespace");
    });

    it("returns compact catalog matches when a query is provided", async () => {
      const result = await handleGetCatalog({
        provider: "aws",
        query: "cloudwatch",
        limit: 2,
      });
      const payload = JSON.parse(result.content[0].text);

      expect(payload.provider).toBe("aws");
      expect(payload.query).toBe("cloudwatch");
      expect(payload.matches).toHaveLength(2);
      expect(payload.matches.map((match: { id: string }) => match.id)).toEqual([
        "cloudwatch-logs",
        "cloudwatch-metrics",
      ]);
      expect(payload.providers).toBeUndefined();
    });
  });

  describe("Kubernetes resources", () => {
    it("lists and reads the Kubernetes example resource", async () => {
      const listRequest = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 20,
          method: "resources/list",
        }),
      });
      const listResponse = await worker.fetch(listRequest);
      const listPayload = (await listResponse.json()) as {
        result: { resources: { uri: string }[] };
      };
      expect(listPayload.result.resources).toContainEqual(
        expect.objectContaining({
          uri: "archlex://examples/k8s-microservices",
        }),
      );

      const readRequest = new Request("https://mcp.archlex.dev/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 21,
          method: "resources/read",
          params: { uri: "archlex://examples/k8s-microservices" },
        }),
      });
      const readResponse = await worker.fetch(readRequest);
      const readPayload = (await readResponse.json()) as {
        result: { contents: { text: string }[] };
      };
      expect(readPayload.result.contents[0].text).toMatch(/^provider k8s$/m);
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
      result: {
        protocolVersion: string;
        serverInfo: { name: string };
        instructions?: string;
      };
    };
    expect(data.result.protocolVersion).toBe(protocolVersion);
    expect(data.result.serverInfo.name).toBe("archlex-mcp-server");
    expect(data.result.instructions).toContain(
      "Use render_diagram directly for normal diagram requests",
    );
    expect(data.result.instructions).toContain('app: ecs["Next.js"]');
    expect(data.result.instructions).toContain(
      "Do not call validate_diagram first",
    );
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

  it("advertises the authoring workflow in tool descriptions", async () => {
    const response = await worker.fetch(
      mcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/list" }),
    );
    const data = (await response.json()) as {
      result: { tools: { name: string; description?: string }[] };
    };
    const descriptions = Object.fromEntries(
      data.result.tools.map((tool) => [tool.name, tool.description ?? ""]),
    );

    expect(descriptions.render_diagram).toContain(
      "Call `render_diagram` directly for normal diagram requests",
    );
    expect(descriptions.render_diagram).toContain(
      "When a resource identifier is unknown",
    );
    expect(descriptions.render_diagram).toContain(
      "Do not call `validate_diagram` first",
    );
    expect(descriptions.render_diagram).toContain('format: "svg"');
    expect(descriptions.validate_diagram).toContain("hint");
    expect(descriptions.get_cloud_catalog).toContain(
      "Use query for compact results",
    );
    expect(descriptions.generate_playground_url).toContain(
      "Do not call it after render_diagram",
    );
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
