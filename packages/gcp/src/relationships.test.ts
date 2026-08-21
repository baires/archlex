import { describe, expect, it } from "vitest";
import { GCP_RELATIONSHIPS } from "./relationships.js";

describe("GCP relationship definitions", () => {
  it("declares routes for load balancing and IAP rules", () => {
    const routes = GCP_RELATIONSHIPS.find(({ kind }) => kind === "routes");

    expect(routes?.allowedSources).toEqual(
      expect.arrayContaining(["cloud-load-balancing", "iap"]),
    );
    expect(routes?.allowedTargets).toEqual(
      expect.arrayContaining(["cloud-run", "gke", "compute-engine"]),
    );
  });

  it("declares attachment, exposure, failover, and trust semantics", () => {
    const relationships = new Map(
      GCP_RELATIONSHIPS.map((relationship) => [
        relationship.kind,
        relationship,
      ]),
    );

    expect(relationships.get("attaches")?.allowedTargets).toEqual(
      expect.arrayContaining(["persistent-disk", "filestore"]),
    );
    expect(relationships.get("exposes")?.allowedSources).toEqual(
      expect.arrayContaining(["cloud-load-balancing", "api-gateway"]),
    );
    expect(relationships.get("fails-over-to")?.allowedTargets).toEqual(
      expect.arrayContaining(["cloud-sql", "alloydb"]),
    );
    expect(relationships.get("trusts")?.allowedTargets).toEqual(
      expect.arrayContaining([
        "cloud-identity",
        "workforce-identity-federation",
      ]),
    );
  });
});
