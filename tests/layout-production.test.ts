import {
  buildElkGraph,
  computeGeometryFingerprint,
  createInlineLayoutEngine,
} from "@archlex/layout-elk";
import type { CloudGraph, LayoutEdge, LayoutNode } from "@archlex/model";
import { describe, expect, it } from "vitest";

function distanceFromRectangleBoundary(
  point: { x: number; y: number },
  rectangle: LayoutNode,
) {
  const right = rectangle.x + rectangle.width;
  const bottom = rectangle.y + rectangle.height;
  const outsideX = Math.max(rectangle.x - point.x, 0, point.x - right);
  const outsideY = Math.max(rectangle.y - point.y, 0, point.y - bottom);

  if (outsideX > 0 || outsideY > 0) return Math.hypot(outsideX, outsideY);

  return Math.min(
    point.x - rectangle.x,
    right - point.x,
    point.y - rectangle.y,
    bottom - point.y,
  );
}

function findRequiredNode(nodes: readonly LayoutNode[], id: string) {
  const node = nodes.find((candidate) => candidate.id === id);
  expect(node, `missing node ${id}`).toBeDefined();
  if (!node) throw new Error(`missing node ${id}`);
  return node;
}

function expectCompactNestedGeometry(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
  resourceIds: readonly string[],
  scopeIds: readonly string[],
) {
  const resources = resourceIds.map((id) => findRequiredNode(nodes, id));

  for (const resource of resources) {
    expect(resource.width).toBe(128);
    expect(resource.height).toBe(92);
  }

  for (const scopeId of scopeIds) {
    const scope = findRequiredNode(nodes, scopeId);
    const children = scope.children ?? [];
    expect(children.length).toBeGreaterThan(0);

    for (const child of children) {
      expect(child.x).toBeGreaterThanOrEqual(scope.x);
      expect(child.y - scope.y).toBeGreaterThanOrEqual(36);
      expect(child.x + child.width).toBeLessThanOrEqual(scope.x + scope.width);
      expect(child.y + child.height).toBeLessThanOrEqual(
        scope.y + scope.height,
      );
    }
  }

  for (let index = 0; index < resources.length; index += 1) {
    for (
      let otherIndex = index + 1;
      otherIndex < resources.length;
      otherIndex += 1
    ) {
      const left = resources[index];
      const right = resources[otherIndex];
      const overlapX =
        Math.min(left.x + left.width, right.x + right.width) -
        Math.max(left.x, right.x);
      const overlapY =
        Math.min(left.y + left.height, right.y + right.height) -
        Math.max(left.y, right.y);
      expect(overlapX <= 0 || overlapY <= 0).toBe(true);
    }
  }

  for (const edge of edges) {
    const source = findRequiredNode(nodes, edge.source);
    const target = findRequiredNode(nodes, edge.target);
    expect(edge.points).not.toHaveLength(0);
    const startPoint = edge.points[0];
    const endPoint = edge.points.at(-1);
    expect(startPoint).toBeDefined();
    expect(endPoint).toBeDefined();
    if (!startPoint || !endPoint)
      throw new Error(`missing edge points ${edge.id}`);
    expect(
      distanceFromRectangleBoundary(startPoint, source),
    ).toBeLessThanOrEqual(1);
    expect(distanceFromRectangleBoundary(endPoint, target)).toBeLessThanOrEqual(
      1,
    );
  }
}

describe("Phase 4: Production Layout Engine", () => {
  const inlineEngine = createInlineLayoutEngine();

  const sampleGraph: CloudGraph = {
    nodes: [
      {
        id: "vpc1/sub1/app",
        provider: "aws",
        serviceKind: "ecs",
        label: "Amazon ECS",
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
      },
      {
        id: "vpc1/sub1/db",
        provider: "aws",
        serviceKind: "rds",
        label: "Amazon RDS",
        span: {
          start: { line: 2, column: 1, offset: 0 },
          end: { line: 2, column: 1, offset: 0 },
        },
      },
    ],
    edges: [
      {
        id: "app->db",
        source: "vpc1/sub1/app",
        target: "vpc1/sub1/db",
        arrow: "->",
        span: {
          start: { line: 3, column: 1, offset: 0 },
          end: { line: 3, column: 1, offset: 0 },
        },
      },
    ],
    scopes: [
      {
        id: "vpc1",
        kind: "vpc",
        name: "main",
        childrenNodeIds: ["vpc1/sub1/app", "vpc1/sub1/db"],
      },
      {
        id: "vpc1/sub1",
        kind: "subnet",
        name: "private-a",
        childrenNodeIds: ["vpc1/sub1/app", "vpc1/sub1/db"],
      },
    ],
  };

  it.each(["LR", "RL", "TB", "BT"] as const)(
    "supports direction %s",
    async (dir) => {
      const res = await inlineEngine.layout(sampleGraph, { direction: dir });
      expect(res.graph.width).toBeGreaterThan(0);
      expect(res.graph.height).toBeGreaterThan(0);
      expect(res.graph.nodes.length).toBeGreaterThan(0);
    },
  );

  it("configures stable orthogonal routing for dense hierarchical graphs", () => {
    const elkGraph = buildElkGraph(sampleGraph, "LR");

    expect(elkGraph.layoutOptions).toMatchObject({
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.spacing.nodeNodeBetweenLayers": "42",
      "elk.spacing.edgeNode": "40",
    });
    expect(elkGraph.children[0]?.layoutOptions).toMatchObject({
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
    });
  });

  it("calculates deterministic geometry fingerprints", () => {
    const fp1 = computeGeometryFingerprint(sampleGraph, { direction: "LR" });
    const fp2 = computeGeometryFingerprint(sampleGraph, { direction: "LR" });
    const fp3 = computeGeometryFingerprint(sampleGraph, { direction: "TB" });

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it("utilizes geometry cache on repeated layout calls", async () => {
    const first = await inlineEngine.layout(sampleGraph, { direction: "LR" });
    const second = await inlineEngine.layout(sampleGraph, { direction: "LR" });

    expect(second.metadata.durationMs).toBe(0);
    expect(second.graph).toEqual(first.graph);
  });

  it("honors AbortSignal before layout calculation", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      inlineEngine.layout(sampleGraph, { signal: controller.signal }),
    ).rejects.toThrow("aborted");
  });

  it.each(["LR", "RL", "TB", "BT"] as const)(
    "lays out nested compact resource cards within scope boundaries in %s",
    async (direction) => {
      const res = await inlineEngine.layout(sampleGraph, { direction });

      expectCompactNestedGeometry(
        res.graph.nodes,
        res.graph.edges,
        ["vpc1/sub1/app", "vpc1/sub1/db"],
        ["vpc1", "vpc1/sub1"],
      );
    },
  );
});
