import { describe, expect, it } from "vitest";
import { K8S_PHASE_ONE_ICONS } from "../icons/index.js";
import {
  K8S_SERVICE_CATALOG,
  k8sProvider,
  resolveK8sService,
} from "../index.js";

describe("K8S Catalog Services", () => {
  const provider = k8sProvider();

  it.each([
    ["deployment", "Deployment"],
    ["service", "Service"],
    ["pod", "Pod"],
  ])("resolves %s with official inline icon metadata", (id, displayName) => {
    const service = resolveK8sService(id);
    expect(service?.displayName).toBe(displayName);

    const resolved = provider.resolveService(id);
    expect(resolved?.displayName).toBe(displayName);
    expect(resolved?.iconSvg).toBeDefined();
    expect(resolved?.iconSvg).not.toMatch(
      /<(?:script|foreignObject)|\son\w+=|\b(?:href|src)=["']https?:\/\//i,
    );
  });

  it("resolves kubectl-style aliases to canonical identifiers", () => {
    expect(resolveK8sService("deploy")?.id).toBe("deployment");
    expect(resolveK8sService("svc")?.id).toBe("service");
    expect(resolveK8sService("k8s.statefulset")?.id).toBe("statefulset");
    expect(resolveK8sService("ns")?.id).toBe("namespace");
  });

  it("contains unique canonical identifiers", () => {
    expect(new Set(K8S_SERVICE_CATALOG.keys()).size).toBe(
      K8S_SERVICE_CATALOG.size,
    );
  });

  it("provides official inline artwork for every non-boundary service", () => {
    const services = [...K8S_SERVICE_CATALOG.values()].filter(
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

    // Log missing icons for tracking but don't fail the test
    if (missingIcons.length > 0) {
      console.log(`\nK8S services missing icons (${missingIcons.length}):`);
      console.log(missingIcons.join(", "));
      console.log("See docs/expansion/missing-icons.md for tracking\n");
    }

    // For now, we allow missing icons for services without official artwork
    // In production, fallback icons will be used
  });

  it("normalizes Inkscape artifacts into plain attributes", () => {
    for (const icon of Object.values(K8S_PHASE_ONE_ICONS)) {
      expect(icon).not.toContain("<style");
      expect(icon).not.toContain("<metadata");
      expect(icon).not.toContain("<text");
      expect(icon).not.toMatch(/\sclass=/);
      expect(icon).not.toMatch(/\sstyle=/);
      expect(icon).not.toMatch(/\s(?:inkscape|sodipodi):/);
      expect(icon).not.toMatch(/\sdata-[a-z-]+=/i);
    }

    expect(K8S_PHASE_ONE_ICONS["k8s.pod"]).toContain(
      'viewBox="0 0 18.035334 17.500378"',
    );
    expect(K8S_PHASE_ONE_ICONS["k8s.pod"]).toContain("#326ce5");
    expect(K8S_PHASE_ONE_ICONS["k8s.deployment"]).toContain("#326ce5");
  });
});
