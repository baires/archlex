import { describe, expect, it } from "vitest";
import { GCP_PHASE_ONE_ICONS } from "../icons/index.js";
import {
  GCP_SERVICE_CATALOG,
  gcpProvider,
  resolveGcpService,
} from "../index.js";

describe("GCP Catalog Services", () => {
  const provider = gcpProvider();

  it.each([
    ["cloud-sql", "Cloud SQL"],
    ["compute-engine", "Compute Engine"],
    ["pubsub", "Pub/Sub"],
  ])("resolves %s with official inline icon metadata", (id, displayName) => {
    const service = resolveGcpService(id);
    expect(service?.displayName).toBe(displayName);

    const resolved = provider.resolveService(id);
    expect(resolved?.displayName).toBe(displayName);
    expect(resolved?.iconSvg).toBeDefined();
    expect(resolved?.iconSvg).not.toMatch(
      /<(?:script|foreignObject)|\son\w+=|\b(?:href|src)=["']https?:\/\//i,
    );
  });

  it("contains unique canonical identifiers", () => {
    expect(new Set(GCP_SERVICE_CATALOG.keys()).size).toBe(
      GCP_SERVICE_CATALOG.size,
    );
  });

  it("provides official inline artwork for every non-boundary service", () => {
    const services = [...GCP_SERVICE_CATALOG.values()].filter(
      (service) => service.category !== "boundary",
    );

    expect(services).not.toHaveLength(0);
    for (const service of services) {
      expect(
        provider.resolveService(service.id)?.iconSvg,
        `missing icon for ${service.id}`,
      ).toMatch(/^<svg\b/);
    }
  });

  it("inlines the official presentational CSS into plain attributes", () => {
    for (const icon of Object.values(GCP_PHASE_ONE_ICONS)) {
      expect(icon).not.toContain("<style");
      expect(icon).not.toMatch(/\sclass=/);
      expect(icon).not.toMatch(/\sdata-[a-z-]+=/i);
    }

    expect(GCP_PHASE_ONE_ICONS["gcp.compute-engine"]).toContain(
      'viewBox="0 0 512 512"',
    );
    expect(GCP_PHASE_ONE_ICONS["gcp.compute-engine"]).toContain("#4285f4");
    expect(GCP_PHASE_ONE_ICONS["gcp.pubsub"]).toContain("#4285f4");
  });
});
