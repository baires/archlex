import type { Diagnostic, LayoutGraph } from "@cloudmer/model";
import { describe, expect, it } from "vitest";
import { serializeSvgGraph } from "./index.js";

describe("relationship rendering", () => {
  it("renders bidirectional, undirected, and dotted arrow treatments", () => {
    const graph: LayoutGraph = {
      width: 300,
      height: 200,
      nodes: [],
      edges: [
        {
          id: "both",
          source: "a",
          target: "b",
          arrow: "<->",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
        {
          id: "plain",
          source: "a",
          target: "b",
          arrow: "--",
          points: [
            { x: 0, y: 10 },
            { x: 100, y: 10 },
          ],
        },
        {
          id: "dotted",
          source: "a",
          target: "b",
          arrow: "-.->",
          points: [
            { x: 0, y: 20 },
            { x: 100, y: 20 },
          ],
        },
      ],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).toContain('data-cloudmer-arrow="&lt;-&gt;"');
    expect(result.svg).toContain('marker-start="url(#arrowhead-start)"');
    expect(result.svg).toMatch(
      /data-cloudmer-id="plain"[^>]+marker-end="none"/,
    );
    expect(result.svg).toMatch(
      /data-cloudmer-id="dotted"[^>]+stroke-dasharray="6 5"/,
    );
  });

  it("renders rounded orthogonal curve paths for multi-point edges", () => {
    const graph: LayoutGraph = {
      width: 400,
      height: 300,
      nodes: [],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          arrow: "->",
          points: [
            { x: 10, y: 10 },
            { x: 100, y: 10 },
            { x: 100, y: 100 },
          ],
        },
      ],
    };

    const result = serializeSvgGraph(graph);
    expect(result.svg).toContain("Q 100.0 10.0");
  });
});

describe("Mermaid-aligned rendering", () => {
  it("uses compact neutral definitions without glass or active styling", () => {
    const graph: LayoutGraph = {
      width: 100,
      height: 100,
      nodes: [],
      edges: [],
    };
    const result = serializeSvgGraph(graph, [], "dark");

    expect(result.svg).toContain('markerUnits="strokeWidth"');
    expect(result.svg).toContain("g.cloudmer-node:focus-visible");
    expect(result.svg).not.toContain("cloudmer-node-bg");
    expect(result.svg).not.toContain("cloudmer-sheen");
    expect(result.svg).not.toContain("cloudmer-glow");
    expect(result.svg).not.toContain("cloudmer-scope-header");
    expect(result.svg).not.toContain("transition:");
  });

  it("renders a neutral node surface, official 48px artwork, and two-line labels", () => {
    const graph: LayoutGraph = {
      width: 500,
      height: 500,
      nodes: [
        {
          id: "rds1",
          x: 50,
          y: 50,
          width: 140,
          height: 104,
          label: "Amazon RDS & Primary",
          icon: '<svg width="64" height="64" viewBox="0 0 64 64"><path fill="#e7157b" d="M0 0h64v64H0z"/></svg>',
          iconKey: "aws-rds",
        },
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);
    expect(result.svg).toContain('class="cloudmer-node"');
    expect(result.svg).toContain('class="cloudmer-node-surface"');
    expect(result.svg).toContain('rx="6" ry="6"');
    expect(result.svg).toContain('width="48" height="48"');
    expect(result.svg).toContain('viewBox="0 0 64 64"');
    expect(result.svg).toContain('fill="#e7157b"');
    expect(result.svg).toContain('aria-hidden="true" focusable="false"');
    expect(result.svg).toContain('data-cloudmer-icon="aws-rds"');
    expect(result.svg).toContain(">Amazon RDS &amp;</tspan>");
    expect(result.svg).toContain(">Primary</tspan>");
    expect(result.svg).toContain('aria-label="Amazon RDS &amp; Primary"');
  });

  it("renders quiet scope boundaries with inline kind and name labels", () => {
    const graph: LayoutGraph = {
      width: 600,
      height: 400,
      nodes: [
        {
          id: "vpc1",
          x: 20,
          y: 20,
          width: 300,
          height: 200,
          label: "vpc: application",
          children: [
            { id: "n1", x: 30, y: 50, width: 80, height: 50, label: "App" },
          ],
        },
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);
    expect(result.svg).toContain('class="cloudmer-scope-label"');
    expect(result.svg).toContain('stroke-width="1.5"');
    expect(result.svg).toContain('stroke-dasharray="5 4"');
    expect(result.svg).toContain("<tspan");
    expect(result.svg).toContain("VPC");
    expect(result.svg).toContain("application");
    expect(result.svg).not.toContain("cloudmer-scope-header");
  });

  it("renders dashed diagnostic surfaces and accessible status markers", () => {
    const graph: LayoutGraph = {
      width: 400,
      height: 200,
      nodes: [
        {
          id: "error-node",
          x: 20,
          y: 20,
          width: 140,
          height: 80,
          label: "Error node",
        },
        {
          id: "warning-node",
          x: 200,
          y: 20,
          width: 140,
          height: 80,
          label: "Warning node",
        },
      ],
      edges: [],
    };
    const diagnostics: Diagnostic[] = [
      {
        code: "ERR-001",
        severity: "error",
        message: "Invalid error node",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        elements: ["error-node"],
      },
      {
        code: "WARN-001",
        severity: "warning",
        message: "Review warning node",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        elements: ["warning-node"],
      },
    ];

    const result = serializeSvgGraph(graph, diagnostics);
    expect(result.svg).toMatch(
      /id="node-error-node"[\s\S]+?stroke-dasharray="4 3"/,
    );
    expect(result.svg).toMatch(
      /id="node-warning-node"[\s\S]+?stroke-dasharray="2 2"/,
    );
    expect(result.svg.match(/class="cloudmer-status-marker"/g)).toHaveLength(2);
    expect(result.svg).toContain('aria-describedby="cloudmer-diagnostic-0"');
    expect(result.svg).toContain('aria-describedby="cloudmer-diagnostic-1"');
    expect(result.svg).toContain(">!</text>");
    expect(result.svg).toContain("Invalid error node");
    expect(result.svg).toContain("Review warning node");
  });
});
