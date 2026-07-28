import { describe, expect, it } from "vitest";
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
});
