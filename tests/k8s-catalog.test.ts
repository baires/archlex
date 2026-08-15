import {
  K8S_CATALOG_MANIFEST,
  K8S_SANITIZED_ICONS,
  K8S_SERVICE_CATALOG,
  k8sProvider,
  resolveK8sService,
} from "@archlex/k8s";
import { describe, expect, it } from "vitest";

describe("Kubernetes Catalog & Icon Manifest", () => {
  it("resolves canonical resource IDs and kubectl-style aliases", () => {
    expect(resolveK8sService("deployment")?.id).toBe("deployment");
    expect(resolveK8sService("deploy")?.id).toBe("deployment");
    expect(resolveK8sService("k8s.deployment")?.id).toBe("deployment");
    expect(resolveK8sService("svc")?.id).toBe("service");
    expect(resolveK8sService("ns")?.id).toBe("namespace");
    expect(resolveK8sService("pvc")?.id).toBe("persistentvolumeclaim");
  });

  it("contains at least 60 resources across shared catalog categories", () => {
    expect(K8S_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(60);

    const categories = new Set(
      [...K8S_SERVICE_CATALOG.values()].map((service) => service.category),
    );
    for (const category of [
      "boundary",
      "compute",
      "containers",
      "integration",
      "management",
      "networking",
      "security",
      "storage",
    ]) {
      expect(categories).toContain(category);
    }
  });

  it("resolves metadata and bundled SVGs through k8sProvider", () => {
    const provider = k8sProvider();
    const deployment = provider.resolveService("deployment");
    expect(deployment).toMatchObject({
      id: "deployment",
      displayName: "Deployment",
      iconKey: "k8s.deployment",
    });
    expect(deployment?.iconSvg).toContain("<path");

    expect(provider.resolveService("svc")?.displayName).toBe("Service");
  });

  it("ships a deterministic sanitized icon manifest", () => {
    expect(K8S_CATALOG_MANIFEST.releaseId).toBe("2026-08-14-k8s-official");
    expect(K8S_CATALOG_MANIFEST.checksum).toBe(
      "cb828bdc53155609238474603aa2d2db5b7fc9ef61d1d13a04eb5f4bc2b9be47",
    );
    expect(Object.keys(K8S_SANITIZED_ICONS).length).toBeGreaterThan(30);

    for (const [key, icon] of Object.entries(K8S_SANITIZED_ICONS)) {
      expect(icon.key).toBe(key);
      expect(icon.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(icon.svgFragment).not.toMatch(
        /<script|foreignObject|\son\w+=|<style|https?:/i,
      );
    }
  });
});
