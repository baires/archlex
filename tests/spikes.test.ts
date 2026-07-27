import { awsProvider } from "@cloudmer/aws";
import { createCloudMer } from "@cloudmer/core";
import { createInlineLayoutEngine } from "@cloudmer/layout-elk";
import { CloudMerAbortError, type RelationshipAst } from "@cloudmer/model";
import { parse } from "@cloudmer/parser";
import { createSvgRenderer } from "@cloudmer/renderer-svg";
import { describe, expect, it } from "vitest";

describe("Phase 0 Spikes", () => {
  describe("Chevrotain Parser Spike", () => {
    it("parses valid relationship syntax and maps spans", () => {
      const res = parse("rds-proxy > rds");
      expect(res.diagnostics).toHaveLength(0);
      expect(res.ast.statements).toHaveLength(1);
      const stmt = res.ast.statements[0] as RelationshipAst;
      expect(stmt.type).toBe("relationship");
      expect(stmt.left.kind).toBe("rds-proxy");
      expect(stmt.right.kind).toBe("rds");
      expect(stmt.arrow).toBe(">");
    });

    it("recovers from syntax errors and generates CM-PARSE diagnostics", () => {
      const res = parse("rds-proxy >");
      expect(res.diagnostics.length).toBeGreaterThan(0);
      expect(res.diagnostics[0].code).toMatch(/^CM-PARSE-/);
    });
  });

  describe("ELK Layout Spike", () => {
    it("runs inline layout calculation", async () => {
      const engine = createInlineLayoutEngine();
      const res = await engine.layout({
        nodes: [
          {
            id: "a",
            provider: "aws",
            serviceKind: "rds",
            label: "RDS",
            span: {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 1, offset: 0 },
            },
          },
          {
            id: "b",
            provider: "aws",
            serviceKind: "ecs",
            label: "ECS",
            span: {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 1, offset: 0 },
            },
          },
        ],
        edges: [
          {
            id: "a-b",
            source: "a",
            target: "b",
            arrow: ">",
            span: {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 1, offset: 0 },
            },
          },
        ],
        scopes: [],
      });

      expect(res.graph.nodes).toHaveLength(2);
      expect(res.graph.edges).toHaveLength(1);
      expect(res.metadata.engine).toBe("elk-inline");
    });

    it("handles AbortSignal cancellation", async () => {
      const engine = createInlineLayoutEngine();
      const controller = new AbortController();
      controller.abort();

      await expect(
        engine.layout(
          { nodes: [], edges: [], scopes: [] },
          { signal: controller.signal },
        ),
      ).rejects.toThrow(CloudMerAbortError);
    });
  });

  describe("SVG Renderer Spike", () => {
    it("renders DOM-free SVG string and element mappings", () => {
      const renderer = createSvgRenderer();
      const result = renderer.render({
        width: 400,
        height: 300,
        nodes: [
          {
            id: "n1",
            x: 10,
            y: 20,
            width: 120,
            height: 60,
            label: "RDS Proxy",
          },
        ],
        edges: [],
      });

      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain('role="graphics-document"');
      expect(result.svg).toContain("RDS Proxy");
      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].elementId).toBe("n1");
    });
  });

  describe("End-to-End Core Pipeline Spike", () => {
    it("renders source 'rds-proxy > rds' to SVG", async () => {
      const cloudmer = createCloudMer({
        providers: [awsProvider()],
      });

      const res = await cloudmer.render("rds-proxy > rds");
      expect(res.svg).toContain("rds-proxy");
      expect(res.svg).toContain("rds");
      expect(res.ast.statements).toHaveLength(1);
      expect(res.graph.nodes).toHaveLength(2);
    });
  });
});
