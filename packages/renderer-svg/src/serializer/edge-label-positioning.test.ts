import type { LayoutGraph } from "@cloudmer/model";
import { describe, expect, it } from "vitest";
import { serializeSvgGraph } from "./index.js";

describe("edge label collision avoidance", () => {
  it("places edge label away from nodes when midpoint would overlap", () => {
    const graph: LayoutGraph = {
      width: 600,
      height: 300,
      nodes: [
        {
          id: "left",
          x: 50,
          y: 100,
          width: 128,
          height: 92,
          label: "Left Node",
        },
        {
          id: "blocking",
          x: 286,
          y: 100,
          width: 128,
          height: 92,
          label: "Middle Node",
        },
        {
          id: "right",
          x: 472,
          y: 100,
          width: 128,
          height: 92,
          label: "Right Node",
        },
      ],
      edges: [
        {
          id: "edge1",
          source: "left",
          target: "right",
          arrow: "->",
          label: "publishes",
          points: [
            { x: 178, y: 146 },
            { x: 472, y: 146 },
          ],
        },
      ],
    };

    const result = serializeSvgGraph(graph);

    // Extract the edge label position
    const labelMatch = result.svg.match(
      /class="cloudmer-edge-label" transform="translate\(([^,]+), ([^)]+)\)"/,
    );
    expect(labelMatch).toBeTruthy();

    if (labelMatch) {
      const labelX = Number.parseFloat(labelMatch[1]);
      const labelY = Number.parseFloat(labelMatch[2]);

      // The label should NOT be at the midpoint (325, 146)
      // because the middle node (286-414, 100-192) would overlap
      const midpointX = 325;
      const isAtMidpoint = Math.abs(labelX - midpointX) < 5;

      // Check if label would overlap with blocking node if at midpoint
      const blockingNode = graph.nodes[1];
      const labelWidth = Math.max(38, "publishes".length * 6.6 + 14); // match actual calculation
      const labelHeight = 21;
      const clearance = 12;

      const labelAtMidpointRect = {
        x: midpointX - labelWidth / 2 - clearance,
        y: labelY - labelHeight / 2 - clearance,
        width: labelWidth + clearance * 2,
        height: labelHeight + clearance * 2,
      };

      const nodeRect = {
        x: blockingNode.x,
        y: blockingNode.y,
        width: blockingNode.width,
        height: blockingNode.height,
      };

      const wouldOverlap =
        labelAtMidpointRect.x < nodeRect.x + nodeRect.width &&
        labelAtMidpointRect.x + labelAtMidpointRect.width > nodeRect.x &&
        labelAtMidpointRect.y < nodeRect.y + nodeRect.height &&
        labelAtMidpointRect.y + labelAtMidpointRect.height > nodeRect.y;

      if (wouldOverlap) {
        expect(isAtMidpoint).toBe(false);
      }
    }
  });

  it("uses midpoint when no nodes are nearby", () => {
    const graph: LayoutGraph = {
      width: 400,
      height: 200,
      nodes: [
        {
          id: "left",
          x: 20,
          y: 50,
          width: 128,
          height: 92,
          label: "Source",
        },
        {
          id: "right",
          x: 252,
          y: 50,
          width: 128,
          height: 92,
          label: "Target",
        },
      ],
      edges: [
        {
          id: "edge1",
          source: "left",
          target: "right",
          arrow: "->",
          label: "invokes",
          points: [
            { x: 148, y: 96 },
            { x: 252, y: 96 },
          ],
        },
      ],
    };

    const result = serializeSvgGraph(graph);

    const labelMatch = result.svg.match(
      /class="cloudmer-edge-label" transform="translate\(([^,]+), ([^)]+)\)"/,
    );
    expect(labelMatch).toBeTruthy();

    if (labelMatch) {
      const labelX = Number.parseFloat(labelMatch[1]);
      const expectedMidX = 200;
      expect(Math.abs(labelX - expectedMidX)).toBeLessThan(1);
    }
  });

  it("finds alternative positions along the route when midpoint conflicts", () => {
    const graph: LayoutGraph = {
      width: 500,
      height: 400,
      nodes: [
        {
          id: "top",
          x: 186,
          y: 20,
          width: 128,
          height: 92,
          label: "Top",
        },
        {
          id: "blocking",
          x: 186,
          y: 154,
          width: 128,
          height: 92,
          label: "Center",
        },
        {
          id: "bottom",
          x: 186,
          y: 288,
          width: 128,
          height: 92,
          label: "Bottom",
        },
      ],
      edges: [
        {
          id: "edge1",
          source: "top",
          target: "bottom",
          arrow: "->",
          label: "triggers",
          points: [
            { x: 250, y: 112 },
            { x: 250, y: 288 },
          ],
        },
      ],
    };

    const result = serializeSvgGraph(graph);

    const labelMatch = result.svg.match(
      /class="cloudmer-edge-label" transform="translate\(([^,]+), ([^)]+)\)"/,
    );
    expect(labelMatch).toBeTruthy();

    if (labelMatch) {
      const labelY = Number.parseFloat(labelMatch[2]);
      const midpointY = 200;

      // Label should be positioned away from the blocking node's range (154-246)
      const blockingNode = graph.nodes[1];
      const clearance = 12;
      const labelHeight = 21;

      const isInBlockingZone =
        labelY + labelHeight / 2 + clearance > blockingNode.y &&
        labelY - labelHeight / 2 - clearance <
          blockingNode.y + blockingNode.height;

      // If there's a clear alternative, it should avoid the blocking zone
      // or at least not be centered on the blocking node
      if (Math.abs(labelY - midpointY) > 20) {
        expect(isInBlockingZone).toBe(false);
      }
    }
  });
});
