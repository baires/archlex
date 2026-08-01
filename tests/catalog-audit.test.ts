import { AWS_SERVICE_CATALOG } from "@archlex/aws";
import { GCP_SERVICE_CATALOG } from "@archlex/gcp";
import { describe, expect, it } from "vitest";

describe("Catalog Audit & Baseline Statistics", () => {
  it("AWS service catalog contains at least 190 service definitions", () => {
    expect(AWS_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(190);
  });

  it("GCP service catalog contains at least 160 service definitions", () => {
    expect(GCP_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(160);
  });
});
