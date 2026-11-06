import {
  awsProvider,
  cloudflareProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { describe, expect, it } from "vitest";
import {
  multicloudSource,
  providers,
  reviewSources,
} from "../apps/landing/src/data/site";

const engine = createArchLex({
  providers: [
    awsProvider(),
    cloudflareProvider(),
    gcpProvider(),
    k8sProvider(),
  ],
});

const catalogSizes: Record<string, number> = {
  AWS: awsProvider().listServices().length,
  Cloudflare: cloudflareProvider().listServices().length,
  GCP: gcpProvider().listServices().length,
  Kubernetes: k8sProvider().listServices().length,
};

describe("landing examples against real provider rules", () => {
  for (const provider of providers) {
    it(`offers a checked ${provider.name} starting point`, () => {
      expect(Number.parseInt(provider.count, 10)).toBe(
        catalogSizes[provider.name],
      );
      expect(
        engine
          .prepare(provider.source)
          .diagnostics.filter((item) => item.severity !== "info"),
      ).toEqual([]);
    });
  }

  it("renders the hero from all four providers without warnings", () => {
    const prepared = engine.prepare(multicloudSource);
    expect(prepared.diagnostics).toEqual([]);
    expect(
      [...new Set(prepared.graph.nodes.map((node) => node.provider))].sort(),
    ).toEqual(["aws", "cloudflare", "gcp", "k8s"]);
  });

  it("demonstrates exactly one real endpoint warning and fixes it", () => {
    const warnings = engine.prepare(reviewSources.warning).diagnostics;
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      code: "AWS-RELATIONSHIP-INVALID-ENDPOINT-001",
      severity: "warning",
      elements: ["worker", "data"],
    });
    expect(engine.prepare(reviewSources.valid).diagnostics).toEqual([]);
  });
});
