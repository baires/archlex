import { describe, expect, it } from "vitest";
import { awsProvider, createCloudMer } from "./index.js";

describe("Phase 1 canonical rendering", () => {
  it("renders the complete RDS Proxy to RDS to ECS chain", async () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });

    const result = await cloudmer.render("rds-proxy > rds > ecs");

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "rds-proxy",
      "rds",
      "ecs",
    ]);
    expect(result.graph.edges).toHaveLength(2);
    expect(result.graph.nodes.every((node) => node.icon)).toBe(true);
    expect(result.svg).toContain("Amazon RDS Proxy");
    expect(result.svg).toContain("Amazon RDS");
    expect(result.svg).toContain("Amazon ECS");
    expect(result.svg).toContain('data-cloudmer-icon="aws.rds-proxy"');
  });

  it("returns byte-identical SVG for repeated canonical renders", async () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });

    const first = await cloudmer.render("rds-proxy > rds > ecs");
    const second = await cloudmer.render("rds-proxy > rds > ecs");

    expect(second.svg).toBe(first.svg);
  });
});
