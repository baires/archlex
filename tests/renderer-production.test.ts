import type { Diagnostic, LayoutGraph } from "@cloudmer/model";
import { serializeSvgGraph } from "@cloudmer/renderer-svg";
import { describe, expect, it } from "vitest";

describe("Phase 4: Production SVG Renderer", () => {
  const layoutGraph: LayoutGraph = {
    width: 600,
    height: 400,
    nodes: [
      {
        id: "b_node",
        x: 200.123,
        y: 100.456,
        width: 180,
        height: 92,
        label: "Node B",
      },
      {
        id: "a_node",
        x: 10.789,
        y: 20.0,
        width: 180,
        height: 92,
        label: "Node A",
      },
    ],
    edges: [
      {
        id: "edge_2",
        source: "b_node",
        target: "a_node",
        points: [
          { x: 200, y: 100 },
          { x: 10, y: 20 },
        ],
        arrow: "->",
      },
    ],
  };

  it("sorts SVG elements deterministically by ID", () => {
    const res = serializeSvgGraph(layoutGraph, [], "dark");
    const posA = res.svg.indexOf('id="node-a_node"');
    const posB = res.svg.indexOf('id="node-b_node"');

    expect(posA).toBeGreaterThan(-1);
    expect(posB).toBeGreaterThan(-1);
    expect(posA).toBeLessThan(posB);
  });

  it("formats numeric coordinates with fixed 1 decimal precision", () => {
    const res = serializeSvgGraph(layoutGraph, [], "dark");
    expect(res.svg).toContain('transform="translate(200.1, 100.5)"');
    expect(res.svg).toContain('transform="translate(10.8, 20.0)"');
  });

  it("supports light and dark theme configurations", () => {
    const darkRes = serializeSvgGraph(layoutGraph, [], "dark");
    const lightRes = serializeSvgGraph(layoutGraph, [], "light");

    expect(darkRes.svg).toContain('fill="#1f2937"');
    expect(lightRes.svg).toContain('fill="#ffffff"');
    expect(darkRes.svg).toContain('stroke="#64748b"');
    expect(lightRes.svg).toContain('stroke="#84909f"');
  });

  it("applies accessibility attributes graphics-document and tabindex=0", () => {
    const res = serializeSvgGraph(layoutGraph, [], "dark");
    expect(res.svg).toContain('role="graphics-document"');
    expect(res.svg).toContain('aria-label="CloudMer Architecture Diagram"');
    expect(res.svg).toContain('tabindex="0"');
  });

  it("applies visual diagnostic error stroke and warning treatment", () => {
    const diagnostics: Diagnostic[] = [
      {
        code: "ERR-001",
        severity: "error",
        message: "Error on Node A",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        elements: ["a_node"],
      },
    ];

    const res = serializeSvgGraph(layoutGraph, diagnostics, "dark");
    expect(res.svg).toContain('stroke="#ef4444"');
    expect(res.svg).toContain('stroke-dasharray="4 3"');
    expect(res.svg).toContain('class="cloudmer-status-marker"');
  });
});
