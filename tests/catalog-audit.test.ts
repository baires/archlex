import { AWS_SERVICE_CATALOG } from "@archlex/aws";
import { cloudflareProvider } from "@archlex/cloudflare";
import {
  validateCatalogContainment,
  validateCatalogManifest,
} from "@archlex/diagnostics";
import { GCP_SERVICE_CATALOG } from "@archlex/gcp";
import { K8S_SERVICE_CATALOG } from "@archlex/k8s";
import { describe, expect, it } from "vitest";
import { validateCloudflareRegistration } from "../scripts/validate-catalog.mjs";

describe("Catalog Audit & Baseline Statistics", () => {
  it("AWS service catalog contains at least 190 service definitions", () => {
    expect(AWS_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(190);
  });

  it("GCP service catalog contains at least 160 service definitions", () => {
    expect(GCP_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(160);
  });

  it("Kubernetes catalog contains at least 60 resource definitions", () => {
    expect(K8S_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(60);
  });

  it("registers Cloudflare aliases, scopes, and artwork mappings", () => {
    const provider = cloudflareProvider();
    const services = provider.listServices?.() ?? [];

    expect(services.length).toBeGreaterThanOrEqual(1);
    expect(
      validateCloudflareRegistration({
        services,
        supportedScopes: provider.supportedScopes ?? [],
        resolveService: (kind) => provider.resolveService(kind),
      }),
    ).toEqual([]);
  });

  it("keeps existing provider catalogs valid", () => {
    for (const catalog of [
      AWS_SERVICE_CATALOG,
      GCP_SERVICE_CATALOG,
      K8S_SERVICE_CATALOG,
    ]) {
      expect(validateCatalogManifest(catalog).valid).toBe(true);
      expect(validateCatalogContainment(catalog)).toEqual([]);
    }
  });
});
