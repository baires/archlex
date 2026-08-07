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
      expect(result.content[0].type).toBe("text");

      const payload = JSON.parse(result.content[0].text);
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
      const payload = JSON.parse(result.content[0].text);

      expect(payload.diagnostics.length).toBeGreaterThan(0);
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
  });
});
