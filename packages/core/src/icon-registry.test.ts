import type { IconRegistry, SanitizedIcon } from "@archlex/icons-core";
import type { CloudGraph } from "@archlex/model";
import { describe, expect, it } from "vitest";
import { applyIconRegistry, collectIconRequests } from "./icon-registry.js";

const span = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 10, offset: 9 },
};

const fetchedIcon: SanitizedIcon = {
  key: "apprunner",
  provider: "aws",
  checksum: "sha256:fetched",
  viewBox: "0 0 64 64",
  svgFragment: '<svg viewBox="0 0 64 64"><path d="M0 0h64v64H0z"/></svg>',
};

function graphWithNodes(nodes: CloudGraph["nodes"]): CloudGraph {
  return { nodes, edges: [], scopes: [] };
}

describe("icon registry", () => {
  it("collects a canonical request for a missing provider-prefixed icon", () => {
    const graph = graphWithNodes([
      {
        id: "app",
        provider: "aws",
        serviceKind: "apprunner",
        label: "AWS App Runner",
        iconKey: "aws.apprunner",
        span,
      },
    ]);

    expect(collectIconRequests(graph)).toEqual([
      { provider: "aws", key: "apprunner" },
    ]);
  });

  it("deduplicates requests and skips nodes with bundled icons", () => {
    const graph = graphWithNodes([
      {
        id: "first",
        provider: "aws",
        serviceKind: "apprunner",
        label: "First",
        iconKey: "aws.apprunner",
        span,
      },
      {
        id: "second",
        provider: "aws",
        serviceKind: "apprunner",
        label: "Second",
        iconKey: "aws.apprunner",
        span,
      },
      {
        id: "bundled",
        provider: "aws",
        serviceKind: "lambda",
        label: "Bundled",
        iconKey: "aws.lambda",
        icon: "<svg>bundled</svg>",
        span,
      },
    ]);

    expect(collectIconRequests(graph)).toEqual([
      { provider: "aws", key: "apprunner" },
    ]);
  });

  it("applies fetched icons without mutating the input graph", () => {
    const graph = graphWithNodes([
      {
        id: "app",
        provider: "aws",
        serviceKind: "apprunner",
        label: "AWS App Runner",
        iconKey: "aws.apprunner",
        span,
      },
    ]);
    const registry: IconRegistry = new Map([["aws:apprunner", fetchedIcon]]);

    const applied = applyIconRegistry(graph, registry);

    expect(applied.nodes[0]?.icon).toBe(fetchedIcon.svgFragment);
    expect(applied.nodes[0]).not.toBe(graph.nodes[0]);
    expect(graph.nodes[0]?.icon).toBeUndefined();
  });
});
