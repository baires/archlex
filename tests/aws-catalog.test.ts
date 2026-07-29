import {
  AWS_CATALOG_MANIFEST,
  AWS_SANITIZED_ICONS,
  AWS_SERVICE_CATALOG,
  awsProvider,
  resolveAwsService,
} from "@cloudmer/aws";
import { describe, expect, it } from "vitest";

describe("Phase 3: AWS Catalog & Icon Manifest", () => {
  it("resolves canonical service IDs and aliases", () => {
    expect(resolveAwsService("rds")?.id).toBe("rds");
    expect(resolveAwsService("database")?.id).toBe("rds");
    expect(resolveAwsService("aws.rds")?.id).toBe("rds");

    expect(resolveAwsService("rds-proxy")?.id).toBe("rds-proxy");
    expect(resolveAwsService("proxy")?.id).toBe("rds-proxy");

    expect(resolveAwsService("lambda")?.id).toBe("lambda");
    expect(resolveAwsService("function")?.id).toBe("lambda");
  });

  it("contains 20+ service definitions across required categories", () => {
    expect(AWS_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(20);

    const categories = new Set(
      Array.from(AWS_SERVICE_CATALOG.values()).map((s) => s.category),
    );

    expect(categories).toContain("networking");
    expect(categories).toContain("compute");
    expect(categories).toContain("database");
    expect(categories).toContain("storage");
    expect(categories).toContain("messaging");
    expect(categories).toContain("identity");
    expect(categories).toContain("boundary");
  });

  it("resolves metadata and icon SVGs through awsProvider().resolveService()", () => {
    const provider = awsProvider();
    const rdsMeta = provider.resolveService("rds");
    expect(rdsMeta).toBeDefined();
    expect(rdsMeta?.displayName).toBe("Amazon RDS");
    expect(rdsMeta?.iconSvg).toContain("<rect");

    const proxyMeta = provider.resolveService("rds-proxy");
    expect(proxyMeta).toBeDefined();
    expect(proxyMeta?.displayName).toBe("Amazon RDS Proxy");
  });

  it("manifest has valid SHA-256 checksums and sanitized SVG fragments", () => {
    expect(AWS_CATALOG_MANIFEST.releaseId).toBeDefined();
    expect(AWS_CATALOG_MANIFEST.checksum).toBe(
      "4b0ceea3ece5e9f3a2c5f201733386b0c9bfefcb71c23c5cca38ce00ebbb0506",
    );
    expect(AWS_CATALOG_MANIFEST.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(AWS_SANITIZED_ICONS).length).toBeGreaterThan(0);

    expect(Object.keys(AWS_SANITIZED_ICONS).length).toBeGreaterThanOrEqual(3);

    for (const [key, icon] of Object.entries(AWS_SANITIZED_ICONS)) {
      expect(icon.key).toBe(key);
      expect(icon.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(icon.svgFragment).not.toContain("<script");
      expect(icon.svgFragment).not.toContain("foreignObject");
      expect(icon.svgFragment).not.toContain("onclick");
    }

    const serializedCatalog = JSON.stringify(AWS_CATALOG_MANIFEST);
    expect(serializedCatalog).not.toMatch(/https?:|<script|\son\w+=/i);
  });
});
