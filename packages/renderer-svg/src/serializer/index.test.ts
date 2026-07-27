import type { LayoutGraph } from "@cloudmer/model";
import { describe, expect, it } from "vitest";
import { serializeSvgGraph } from "./index.js";

describe("relationship rendering", () => {
  it("renders bidirectional, undirected, and dotted arrow treatments", () => {
    const graph: LayoutGraph = {
      width: 300,
      height: 200,
      nodes: [],
      edges: [
        { id: "both", source: "a", target: "b", arrow: "<->", points: [] },
        { id: "plain", source: "a", target: "b", arrow: "--", points: [] },
        { id: "dotted", source: "a", target: "b", arrow: "-.->", points: [] },
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
});
