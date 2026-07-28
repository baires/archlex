import {
  computeGeometryFingerprint,
  createInlineLayoutEngine,
} from "@cloudmer/layout-elk";
import type { CloudGraph } from "@cloudmer/model";
import { describe, expect, it } from "vitest";

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
});
