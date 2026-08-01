import {
  GCP_CATALOG_MANIFEST,
  GCP_SANITIZED_ICONS,
  GCP_SERVICE_CATALOG,
  gcpProvider,
  resolveGcpService,
} from "@archlex/gcp";
import { describe, expect, it } from "vitest";

describe("GCP Catalog & Icon Manifest", () => {
  it("resolves canonical service IDs and aliases", () => {
    expect(resolveGcpService("cloud-sql")?.id).toBe("cloud-sql");
    expect(resolveGcpService("sql")?.id).toBe("cloud-sql");
    expect(resolveGcpService("gcp.cloud-sql")?.id).toBe("cloud-sql");

    expect(resolveGcpService("compute-engine")?.id).toBe("compute-engine");
    expect(resolveGcpService("gce")?.id).toBe("compute-engine");
    expect(resolveGcpService("vm")?.id).toBe("compute-engine");

    expect(resolveGcpService("cloud-storage")?.id).toBe("cloud-storage");
    expect(resolveGcpService("gcs")?.id).toBe("cloud-storage");
    expect(resolveGcpService("bucket")?.id).toBe("cloud-storage");

    expect(resolveGcpService("gke")?.id).toBe("gke");
    expect(resolveGcpService("kubernetes")?.id).toBe("gke");
  });

  it("contains 20+ service definitions across required categories", () => {
    expect(GCP_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(20);

    const categories = new Set(
      Array.from(GCP_SERVICE_CATALOG.values()).map((s) => s.category),
    );

    expect(categories).toContain("networking");
    expect(categories).toContain("compute");
    expect(categories).toContain("database");
    expect(categories).toContain("storage");
    expect(categories).toContain("messaging");
    expect(categories).toContain("identity");
    expect(categories).toContain("boundary");
  });

  it("resolves metadata and icon SVGs through gcpProvider().resolveService()", () => {
    const provider = gcpProvider();
    const sqlMeta = provider.resolveService("cloud-sql");
    expect(sqlMeta).toBeDefined();
    expect(sqlMeta?.displayName).toBe("Cloud SQL");
    expect(sqlMeta?.iconKey).toBe("gcp.cloud-sql");
    expect(sqlMeta?.iconSvg).toContain("<path");

    const pubsubMeta = provider.resolveService("pubsub");
    expect(pubsubMeta).toBeDefined();
    expect(pubsubMeta?.displayName).toBe("Pub/Sub");
    expect(pubsubMeta?.iconSvg).toBeDefined();
  });

  it("manifest has valid SHA-256 checksums and sanitized SVG fragments", () => {
    expect(GCP_CATALOG_MANIFEST.releaseId).toBeDefined();
    expect(GCP_CATALOG_MANIFEST.checksum).toBe(
      "c3a17a4f2cddf4d69f27e657cd1e44b6ffc2526b2a7b17e68e9eda75fded181b",
    );
    expect(GCP_CATALOG_MANIFEST.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(GCP_SANITIZED_ICONS).length).toBeGreaterThan(0);

    expect(Object.keys(GCP_SANITIZED_ICONS).length).toBeGreaterThanOrEqual(3);

    for (const [key, icon] of Object.entries(GCP_SANITIZED_ICONS)) {
      expect(icon.key).toBe(key);
      expect(icon.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(icon.svgFragment).not.toContain("<script");
      expect(icon.svgFragment).not.toContain("foreignObject");
      expect(icon.svgFragment).not.toContain("onclick");
      expect(icon.svgFragment).not.toContain("<style");
    }

    const serializedCatalog = JSON.stringify(GCP_CATALOG_MANIFEST);
    expect(serializedCatalog).not.toMatch(/https?:|<script|\son\w+=/i);
  });
});
