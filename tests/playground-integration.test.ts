import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import type { LayoutEdge, LayoutNode } from "@archlex/model";
import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_EXAMPLES,
  EXAMPLE_PROVIDERS,
  EXAMPLE_USE_CASES,
} from "../apps/playground/src/examples.js";

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

function expectCompactVpcGeometry(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
) {
  const resourceIds = [
    "account:production/region:us-east-1/vpc:application/subnet:private-a/proxy",
    "account:production/region:us-east-1/vpc:application/subnet:private-a/db",
  ];
  const resources = resourceIds.map((id) => findRequiredNode(nodes, id));
  const subnet = findRequiredNode(
    nodes,
    "account:production/region:us-east-1/vpc:application/subnet:private-a",
  );

  for (const resource of resources) {
    expect(resource.width).toBe(128);
    expect(resource.height).toBe(92);
  }

  const children = subnet.children ?? [];
  expect(children).toHaveLength(resourceIds.length);
  expect(
    Math.min(...children.map((child) => child.y - subnet.y)),
  ).toBeGreaterThanOrEqual(36);

  const [proxy, database] = resources;
  const overlapX =
    Math.min(proxy.x + proxy.width, database.x + database.width) -
    Math.max(proxy.x, database.x);
  const overlapY =
    Math.min(proxy.y + proxy.height, database.y + database.height) -
    Math.max(proxy.y, database.y);
  expect(overlapX <= 0 || overlapY <= 0).toBe(true);

  expect(edges).toHaveLength(1);
  const edge = edges[0];
  expect(edge).toBeDefined();
  if (!edge) throw new Error("missing VPC edge");
  expect(edge.points).not.toHaveLength(0);
  const startPoint = edge.points[0];
  const endPoint = edge.points.at(-1);
  expect(startPoint).toBeDefined();
  expect(endPoint).toBeDefined();
  if (!startPoint || !endPoint)
    throw new Error(`missing edge points ${edge.id}`);
  expect(distanceFromRectangleBoundary(startPoint, proxy)).toBeLessThanOrEqual(
    1,
  );
  expect(distanceFromRectangleBoundary(endPoint, database)).toBeLessThanOrEqual(
    1,
  );
}

describe("Phase 5: Playground Architecture Examples & Render Integration", () => {
  const archlex = createArchLex({
    providers: [awsProvider(), gcpProvider(), k8sProvider()],
  });

  it("renders all built-in architecture examples without structural errors", async () => {
    expect(ARCHITECTURE_EXAMPLES.length).toBeGreaterThanOrEqual(5);

    for (const example of ARCHITECTURE_EXAMPLES) {
      const res = await archlex.render(example.source);
      expect(res.svg).toContain("<svg");
      expect(res.graph.nodes.length).toBeGreaterThan(0);
      const structuralErrors = res.diagnostics.filter((d) =>
        d.code.startsWith("AL-STRUCT-"),
      );
      expect(structuralErrors).toHaveLength(0);
    }
  });

  it("contains unique identifiers and consistent taxonomy metadata", () => {
    const ids = ARCHITECTURE_EXAMPLES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ARCHITECTURE_EXAMPLES.length);

    for (const example of ARCHITECTURE_EXAMPLES) {
      expect(example.id).toBeDefined();
      expect(example.title).toBeDefined();
      expect(EXAMPLE_PROVIDERS).toContain(example.provider);
      expect(EXAMPLE_USE_CASES).toContain(example.useCase);
      expect(example.source.match(/^provider (aws|gcp|k8s)$/m)?.[1]).toBe(
        example.provider,
      );
    }

    const providerBlocks = ARCHITECTURE_EXAMPLES.map(
      (example) => example.provider,
    ).filter((provider, index, providers) => provider !== providers[index - 1]);
    expect(providerBlocks).toEqual(EXAMPLE_PROVIDERS);

    for (const provider of EXAMPLE_PROVIDERS) {
      expect(
        ARCHITECTURE_EXAMPLES.some((example) => example.provider === provider),
      ).toBe(true);
    }
  });

  it("covers five practical Kubernetes architecture scenarios", () => {
    const kubernetesExamples = ARCHITECTURE_EXAMPLES.filter(
      (example) => example.provider === "k8s",
    );
    expect(kubernetesExamples.map((example) => example.id)).toEqual([
      "k8s-microservices",
      "k8s-stateful-application",
      "k8s-scheduled-batch",
      "k8s-autoscaled-api",
      "k8s-namespace-rbac",
    ]);

    const example = ARCHITECTURE_EXAMPLES.find(
      (candidate) => candidate.id === "k8s-microservices",
    );
    expect(example?.source).toMatch(/^provider k8s$/m);
    expect(example?.source).toMatch(/^cluster\s+\S+\s+\{$/m);
    expect(example?.source).toMatch(/^\s+namespace\s+\S+\s+\{$/m);

    const kubernetesSources = kubernetesExamples
      .map((candidate) => candidate.source)
      .join("\n");
    const expectedKinds = [
      "ingress",
      "service",
      "deployment",
      "statefulset",
      "persistentvolumeclaim",
      "persistentvolume",
      "cronjob",
      "configmap",
      "secret",
      "horizontalpodautoscaler",
      "poddisruptionbudget",
      "serviceaccount",
      "role",
      "rolebinding",
    ];

    for (const kind of expectedKinds) {
      expect(kubernetesSources).toMatch(new RegExp(`:\\s+${kind}(?:\\s|$)`));
    }
  });

  it("renders Kubernetes examples without actionable diagnostics", async () => {
    const kubernetesExamples = ARCHITECTURE_EXAMPLES.filter(
      (example) => example.provider === "k8s",
    );

    for (const example of kubernetesExamples) {
      const result = await archlex.render(example.source);
      const actionableDiagnostics = result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.severity === "error" || diagnostic.severity === "warning",
      );
      expect(actionableDiagnostics).toHaveLength(0);
    }
  });

  it("lays out the VPC hierarchy with compact cards and boundary endpoints", async () => {
    const example = ARCHITECTURE_EXAMPLES.find(
      (candidate) => candidate.id === "vpc-hierarchy",
    );
    expect(example).toBeDefined();
    if (!example) throw new Error("missing VPC hierarchy example");

    const res = await archlex.render(example.source);

    expectCompactVpcGeometry(res.layout.nodes, res.layout.edges);
  });

  it("routes enterprise traffic through the public load balancer", async () => {
    const example = ARCHITECTURE_EXAMPLES.find(
      (candidate) => candidate.id === "enterprise-cloud",
    );
    expect(example).toBeDefined();
    if (!example) throw new Error("missing enterprise example");

    const res = await archlex.render(example.source);
    const loadBalancer = res.graph.nodes.find(
      (node) => node.serviceKind === "alb",
    );
    expect(loadBalancer).toBeDefined();
    if (!loadBalancer) throw new Error("missing enterprise load balancer");

    expect(
      res.graph.edges.some((edge) => edge.target === loadBalancer.id),
    ).toBe(true);
    expect(
      res.graph.edges.some((edge) => edge.source === loadBalancer.id),
    ).toBe(true);
  });
});
