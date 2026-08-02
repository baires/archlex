import type { Diagnostic, LayoutGraph, LayoutNode } from "@archlex/model";
import { describe, expect, it } from "vitest";
import { serializeSvgGraph } from "./index.js";

describe("relationship rendering", () => {
  it("leaves the diagram canvas transparent", () => {
    const result = serializeSvgGraph({
      width: 300,
      height: 200,
      nodes: [],
      edges: [],
    });

    expect(result.svg).not.toContain("archlex-canvas");
    expect(result.svg).not.toContain('fill="#ffffff"');
  });

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

    expect(result.svg).toContain('data-archlex-arrow="&lt;-&gt;"');
    expect(result.svg).toContain('marker-start="url(#arrowhead-start)"');
    expect(result.svg).toMatch(/data-archlex-id="plain"[^>]+marker-end="none"/);
    expect(result.svg).toMatch(
      /data-archlex-id="dotted"[^>]+stroke-dasharray="6 5"/,
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

  it("renders an escaped relationship label at the route midpoint", () => {
    const graph: LayoutGraph = {
      width: 240,
      height: 120,
      nodes: [],
      edges: [
        {
          id: "labeled",
          source: "api",
          target: "worker",
          arrow: "->",
          kind: "invokes & awaits",
          points: [
            { x: 20, y: 40 },
            { x: 180, y: 40 },
          ],
        },
      ],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).toContain('class="archlex-edge-label"');
    expect(result.svg).toContain('transform="translate(100.0, 40.0)"');
    expect(result.svg).toContain(">invokes &amp; awaits</text>");
    expect(result.svg).toMatch(
      /data-archlex-id="labeled"[^>]+aria-label="invokes &amp; awaits"/,
    );
  });

  it("serializes and maps deterministic fallback paths for empty and one-point edges", () => {
    const graph: LayoutGraph = {
      width: 300,
      height: 200,
      nodes: [],
      edges: [
        {
          id: "empty",
          source: "a",
          target: "b",
          arrow: "->",
          points: [],
        },
        {
          id: "single",
          source: "a",
          target: "b",
          arrow: "->",
          points: [{ x: 12, y: 34 }],
        },
      ],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).toMatch(
      /data-archlex-id="empty"[^>]+d="M 0\.0 0\.0 L 100\.0 0\.0"/,
    );
    expect(result.svg).toMatch(
      /data-archlex-id="single"[^>]+d="M 12\.0 34\.0 L 12\.0 34\.0"/,
    );
    expect(result.mappings.map((mapping) => mapping.elementId)).toEqual([
      "empty",
      "single",
    ]);
  });

  it.each([
    {
      name: "a two-point route",
      points: [
        { x: 10, y: 20 },
        { x: 110, y: 20 },
      ],
      expectedTransform: "translate(60.0, 20.0)",
    },
    {
      name: "an unequal-segment polyline",
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 40 },
      ],
      expectedTransform: "translate(60.0, 0.0)",
    },
  ])(
    "places an edge diagnostic halfway along $name by cumulative distance",
    ({ points, expectedTransform }) => {
      const graph: LayoutGraph = {
        width: 160,
        height: 100,
        nodes: [],
        edges: [
          {
            id: "diagnostic-edge",
            source: "a",
            target: "b",
            arrow: "->",
            points,
          },
        ],
      };
      const diagnostics: Diagnostic[] = [
        {
          code: "EDGE-WARNING",
          severity: "warning",
          message: "Review route",
          span: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          elements: ["diagnostic-edge"],
        },
      ];

      const result = serializeSvgGraph(graph, diagnostics);

      expect(result.svg).toContain(
        `id="archlex-edge-diagnostic-0" class="archlex-status-marker" transform="${expectedTransform}"`,
      );
    },
  );
});

describe("Mermaid-aligned rendering", () => {
  it("deduplicates shared provider artwork into one namespaced symbol", () => {
    const sharedIcon =
      '<svg viewBox="0 0 4 4"><defs><linearGradient id="paint"><stop offset="0" stop-color="#fff"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="1"/></filter><clipPath id="crop"><rect width="4" height="4"/></clipPath></defs><title id="name">Shared icon</title><path id="shape" fill="url(#paint)" filter="url(#soft)" clip-path="url(#crop)" aria-labelledby="name" d="M0 0h4v4z"/><use href="#shape"/></svg>';
    const graph: LayoutGraph = {
      width: 300,
      height: 120,
      nodes: [
        {
          id: "left/icon",
          x: 10,
          y: 10,
          width: 128,
          height: 92,
          label: "Left",
          icon: sharedIcon,
        },
        {
          id: "right:icon",
          x: 160,
          y: 10,
          width: 128,
          height: 92,
          label: "Right",
          icon: sharedIcon,
        },
      ],
      edges: [],
    };

    const first = serializeSvgGraph(graph).svg;
    const second = serializeSvgGraph(graph).svg;
    expect(second).toBe(first);

    // Identical artwork is emitted once as a shared <symbol>.
    const symbolIds = [...first.matchAll(/<symbol id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(symbolIds).toHaveLength(1);

    // Both nodes reference that symbol; the artwork path appears once.
    const nodeUseRefs = [
      ...first.matchAll(/<use href="#([^"]+)"[^>]*width="48"/g),
    ].map((match) => match[1]);
    expect(nodeUseRefs).toEqual([symbolIds[0], symbolIds[0]]);
    expect(first.match(/<path id="/g)).toHaveLength(1);

    const ids = [...first.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const providerIds = ids.filter((id) => id.startsWith("archlex-icon-"));
    expect(providerIds).toHaveLength(6);
    expect(new Set(providerIds).size).toBe(providerIds.length);
    expect(first).not.toMatch(/\sid="(?:paint|soft|crop|name|shape)"/);
    for (const id of providerIds) {
      expect(id).toMatch(/^archlex-icon-[a-f0-9]+(?:-[a-f0-9]+)+$/);
    }

    const urlReferences = [...first.matchAll(/url\(#([^\)]+)\)/g)].map(
      (match) => match[1],
    );
    const hrefReferences = [...first.matchAll(/\shref="#([^"]+)"/g)].map(
      (match) => match[1],
    );
    const ariaReferences = [
      ...first.matchAll(/\saria-labelledby="([^"]+)"/g),
    ].flatMap((match) => match[1].split(/\s+/));

    for (const reference of [
      ...urlReferences,
      ...hrefReferences,
      ...ariaReferences,
    ]) {
      expect(providerIds).toContain(reference);
    }
  });

  it("omits ArchLex glass chrome while preserving inert provider effects", () => {
    const graph: LayoutGraph = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: "provider-artwork",
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          label: "Provider artwork",
          icon: '<svg viewBox="0 0 1 1"><defs><radialGradient id="provider-gradient"><stop offset="0" stop-color="#fff"/></radialGradient><filter id="provider-filter"><feGaussianBlur stdDeviation="1"/></filter></defs><path fill="url(#provider-gradient)" filter="url(#provider-filter)" d="M0 0h1"/></svg>',
        },
      ],
      edges: [],
    };
    const result = serializeSvgGraph(graph, [], "dark");

    expect(result.svg).toContain('markerUnits="strokeWidth"');
    expect(result.svg).toContain("g.archlex-node:focus-visible");
    expect(result.svg).not.toContain("archlex-node-bg");
    expect(result.svg).not.toContain("archlex-sheen");
    expect(result.svg).not.toContain("archlex-glow");
    expect(result.svg).not.toContain("archlex-scope-header");
    expect(result.svg).not.toMatch(
      /<(?:linearGradient|radialGradient|filter)\b[^>]*\bid=["']archlex-(?:node-bg|sheen|glow)/i,
    );
    expect(result.svg).not.toContain("transition:");
    expect(result.svg).not.toContain("animation:");
    expect(result.svg).not.toContain("animation-name:");
    expect(result.svg).toMatch(
      /<radialGradient id="archlex-icon-[a-f0-9]+-[a-f0-9]+">/,
    );
    expect(result.svg).toMatch(
      /<filter id="archlex-icon-[a-f0-9]+-[a-f0-9]+">/,
    );
    expect(result.svg).not.toMatch(
      /<(?:animate|animateMotion|animateTransform|set)\b/i,
    );
    expect(result.svg).not.toMatch(/\b(?:animation|animation-name)\s*:/i);
    expect(result.svg).not.toMatch(/\b(?:href|xlink:href)=["']data:/i);
    expect(result.svg).not.toMatch(/\b(?:href|xlink:href)=["'](?!#)[^"']+/i);
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
    expect(result.svg).toContain('class="archlex-node"');
    expect(result.svg).toContain('class="archlex-node-surface"');
    expect(result.svg).toContain('rx="6" ry="6"');
    expect(result.svg).toContain('width="48" height="48"');
    expect(result.svg).toContain('viewBox="0 0 64 64"');
    expect(result.svg).toContain('fill="#e7157b"');
    expect(result.svg).toContain('aria-hidden="true" focusable="false"');
    expect(result.svg).toContain('data-archlex-icon="aws-rds"');
    expect(result.svg).toContain(">Amazon RDS &amp;</tspan>");
    expect(result.svg).toContain(">Primary</tspan>");
    expect(result.svg).toContain('aria-label="Amazon RDS &amp; Primary"');
  });

  it("ellipsizes an overlong visible label while preserving its full accessible name", () => {
    const graph: LayoutGraph = {
      width: 200,
      height: 120,
      nodes: [
        {
          id: "long-label",
          x: 20,
          y: 20,
          width: 128,
          height: 92,
          label: "Supercalifragilistic Service Name",
        },
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).toContain(">Supercalifragil…</tspan>");
    expect(result.svg).toContain(
      'aria-label="Supercalifragilistic Service Name"',
    );
  });

  it("wraps canonical names without truncation on wider cards", () => {
    const graph: LayoutGraph = {
      width: 200,
      height: 120,
      nodes: [
        {
          id: "gke",
          x: 20,
          y: 20,
          width: 160,
          height: 92,
          label: "Google Kubernetes Engine",
        },
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).toContain(">Google Kubernetes</tspan>");
    expect(result.svg).toContain(">Engine</tspan>");
    expect(result.svg).not.toContain("…");
  });

  it("uses the accessible name for the node aria-label when present", () => {
    const graph: LayoutGraph = {
      width: 200,
      height: 120,
      nodes: [
        {
          id: "web",
          x: 20,
          y: 20,
          width: 128,
          height: 92,
          label: "web",
          accessibleName: "web (Compute Engine)",
        },
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).toContain('aria-label="web (Compute Engine)"');
    expect(result.svg).toContain(">web</tspan>");
  });

  it("shares one symbol per unique icon across nodes", () => {
    const gkeIcon =
      '<svg viewBox="0 0 10 10"><path fill="#4285f4" d="M0 0h10v10H0z"/></svg>';
    const pubsubIcon =
      '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#aecbfa"/></svg>';
    const node = (
      id: string,
      x: number,
      icon: string,
      iconKey: string,
    ): LayoutNode => ({
      id,
      x,
      y: 10,
      width: 128,
      height: 92,
      label: id,
      icon,
      iconKey,
    });
    const graph: LayoutGraph = {
      width: 500,
      height: 120,
      nodes: [
        node("gke-a", 10, gkeIcon, "gcp.gke"),
        node("gke-b", 160, gkeIcon, "gcp.gke"),
        node("pubsub", 310, pubsubIcon, "gcp.pubsub"),
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);

    const symbolIds = [...result.svg.matchAll(/<symbol id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(symbolIds).toHaveLength(2);
    expect(result.svg.match(/fill="#4285f4"/g)).toHaveLength(1);
    expect(result.svg.match(/fill="#aecbfa"/g)).toHaveLength(1);
    expect(result.svg.match(/<use href="#archlex-icon-/g)).toHaveLength(3);
    expect(result.svg).toContain('data-archlex-icon="gcp.gke"');
  });

  it("falls back to inline artwork when an icon has no viewBox", () => {
    const graph: LayoutGraph = {
      width: 200,
      height: 120,
      nodes: [
        {
          id: "bare",
          x: 20,
          y: 20,
          width: 128,
          height: 92,
          label: "Bare",
          icon: '<svg width="4" height="4"><path d="M0 0h4v4z"/></svg>',
        },
      ],
      edges: [],
    };

    const result = serializeSvgGraph(graph);

    expect(result.svg).not.toContain("<symbol");
    expect(result.svg).toContain('<svg x="40.0" y="10" width="48" height="48"');
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
    expect(result.svg).toContain('class="archlex-scope-label"');
    expect(result.svg).toContain('data-archlex-scope-kind="vpc"');
    expect(result.svg).toContain('class="archlex-scope-accent"');
    expect(result.svg).toContain('stroke-width="1.5"');
    expect(result.svg).toContain('stroke-dasharray="5 4"');
    expect(result.svg).toContain("<tspan");
    expect(result.svg).toContain("VPC");
    expect(result.svg).toContain("application");
    expect(result.svg).not.toContain("archlex-scope-header");
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
    expect(result.svg.match(/class="archlex-status-marker"/g)).toHaveLength(2);
    expect(result.svg).toContain('aria-describedby="archlex-diagnostic-0"');
    expect(result.svg).toContain('aria-describedby="archlex-diagnostic-1"');
    expect(result.svg).toContain(">!</text>");
    expect(result.svg).toContain("Invalid error node");
    expect(result.svg).toContain("Review warning node");
  });

  it("renders scope diagnostics with color, patterns, markers, and accessible associations", () => {
    const graph: LayoutGraph = {
      width: 700,
      height: 300,
      nodes: [
        {
          id: "error-scope",
          x: 20,
          y: 20,
          width: 300,
          height: 220,
          label: "region: us-east-1",
          children: [
            { id: "n1", x: 30, y: 50, width: 80, height: 50, label: "App" },
          ],
        },
        {
          id: "warning-scope",
          x: 360,
          y: 20,
          width: 300,
          height: 220,
          label: "subnet: public-a",
          children: [
            { id: "n2", x: 370, y: 50, width: 80, height: 50, label: "DB" },
          ],
        },
      ],
      edges: [],
    };
    const diagnostics: Diagnostic[] = [
      {
        code: "ERR-SCOPE",
        severity: "error",
        message: "Invalid region scope",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        elements: ["error-scope"],
      },
      {
        code: "WARN-SCOPE",
        severity: "warning",
        message: "Subnet containment warning",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        elements: ["warning-scope"],
      },
    ];

    const result = serializeSvgGraph(graph, diagnostics);

    expect(result.svg).toMatch(
      /id="scope-error-scope"[^>]+aria-describedby="archlex-scope-diagnostic-0"[\s\S]+?stroke="#ef4444"[^>]+stroke-dasharray="4 3"/,
    );
    expect(result.svg).toMatch(
      /id="scope-warning-scope"[^>]+aria-describedby="archlex-scope-diagnostic-1"[\s\S]+?stroke="#f59e0b"[^>]+stroke-dasharray="2 2"/,
    );
    expect(result.svg.match(/class="archlex-status-marker"/g)).toHaveLength(2);
    expect(result.svg).toContain("Invalid region scope");
    expect(result.svg).toContain("Subnet containment warning");
  });
});
