import { describe, expect, it } from "vitest";
import { AWS_SERVICE_CATALOG, resolveAwsService } from "./index.js";

describe("Phase 1 AWS catalog", () => {
  it.each([
    ["rds-proxy", "Amazon RDS Proxy"],
    ["rds", "Amazon RDS"],
    ["ecs", "Amazon ECS"],
  ])("resolves %s with official inline icon metadata", (id, displayName) => {
    const service = resolveAwsService(id);

    expect(service?.displayName).toBe(displayName);
    expect(service?.iconKey).toBe(`aws.${id}`);
    expect(service?.iconSvg).toContain("<svg");
    expect(service?.iconSvg).not.toMatch(
      /<(?:script|foreignObject)|\son\w+=|\b(?:href|src)=["']https?:\/\//i,
    );
  });

  it("contains unique canonical identifiers", () => {
    expect(new Set(AWS_SERVICE_CATALOG.keys()).size).toBe(
      AWS_SERVICE_CATALOG.size,
    );
  });
});
