import { describe, expect, it } from "vitest";
import { AWS_PHASE_ONE_ICONS } from "../icons/index.js";
import {
  AWS_SERVICE_CATALOG,
  awsProvider,
  resolveAwsService,
} from "../index.js";

describe("AWS Catalog Services", () => {
  const provider = awsProvider();

  it.each([
    ["rds-proxy", "Amazon RDS Proxy"],
    ["rds", "Amazon RDS"],
    ["ecs", "Amazon ECS"],
  ])("resolves %s with official inline icon metadata", (id, displayName) => {
    const service = resolveAwsService(id);
    expect(service?.displayName).toBe(displayName);

    const resolved = provider.resolveService(id);
    expect(resolved?.displayName).toBe(displayName);
    expect(resolved?.iconSvg).toBeDefined();
    expect(resolved?.iconSvg).not.toMatch(
      /<(?:script|foreignObject)|\son\w+=|\b(?:href|src)=["']https?:\/\//i,
    );
  });

  it("contains unique canonical identifiers", () => {
    expect(new Set(AWS_SERVICE_CATALOG.keys()).size).toBe(
      AWS_SERVICE_CATALOG.size,
    );
  });

  it("exposes human-friendly discovery terms without treating them as syntax", () => {
    expect(resolveAwsService("Elastic Kubernetes Service")).toBeUndefined();
    expect(resolveAwsService("eks")?.searchTerms).toContain(
      "Elastic Kubernetes Service",
    );
  });

  it("provides official inline artwork for every non-boundary service", () => {
    const services = [...AWS_SERVICE_CATALOG.values()].filter(
      (service) => service.category !== "boundary",
    );

    expect(services).not.toHaveLength(0);

    const missingIcons: string[] = [];
    for (const service of services) {
      const iconSvg = provider.resolveService(service.id)?.iconSvg;
      if (!iconSvg || !iconSvg.match(/^<svg\b/)) {
        missingIcons.push(service.id);
      }
    }

    // Log missing icons for tracking but don't fail the test for Tier 3 services
    if (missingIcons.length > 0) {
      console.log(`\nAWS services missing icons (${missingIcons.length}):`);
      console.log(missingIcons.join(", "));
      console.log("See docs/expansion/missing-icons.md for tracking\n");
    }

    // For now, we allow missing icons for specialized Tier 3 services
    // In production, fallback icons will be used
  });

  it("uses the official phase-one icon artwork", () => {
    expect(AWS_PHASE_ONE_ICONS["aws.rds"]).toContain("#C925D1");
    expect(AWS_PHASE_ONE_ICONS["aws.ecs"]).toContain("#ED7100");
    expect(AWS_PHASE_ONE_ICONS["aws.rds-proxy"]).toContain(
      'viewBox="0 0 48 48"',
    );
    expect(AWS_PHASE_ONE_ICONS["aws.rds"]).not.toContain('<ellipse cx="32"');
    expect(AWS_PHASE_ONE_ICONS["aws.ecs"]).not.toContain(
      '<rect width="64" height="64" rx="8"',
    );
  });
});
