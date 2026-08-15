import type {
  CloudGraph,
  CloudProvider,
  Diagnostic,
  ServiceMetadata,
  ValidationMode,
} from "@archlex/model";
import { initialServices, resolveK8sService } from "./catalog/index.js";
import { K8S_SANITIZED_ICONS } from "./icons/manifest.js";
import { evaluateK8sRules } from "./rules/index.js";

export * from "./builder.js";
export * from "./catalog/index.js";
export * from "./icons/manifest.js";
export * from "./icons/cdn.js";
export * from "./registry.js";
export * from "./rules/index.js";

export function k8sProvider(): CloudProvider {
  return {
    id: "k8s",
    name: "Kubernetes",
    catalogVersion: "2026-08-14-tier1",
    supportedScopes: ["cluster", "namespace"],
    supports(serviceKind: string): boolean {
      return resolveK8sService(serviceKind) !== undefined;
    },
    resolveService(serviceKind: string): ServiceMetadata | undefined {
      const def = resolveK8sService(serviceKind);
      if (!def) return undefined;
      const iconKey = `k8s.${def.id}`;
      const iconObj = K8S_SANITIZED_ICONS[`k8s-${def.id}`];

      // Return bundled icon if available
      // For non-bundled icons, callers can use IconLoader.get("k8s", def.id) directly
      return {
        id: def.id,
        displayName: def.displayName,
        iconKey,
        iconSvg: iconObj ? iconObj.svgFragment : undefined,
      };
    },
    listServices() {
      return initialServices;
    },
    validateGraph(
      graph: CloudGraph,
      mode: ValidationMode = "normal",
    ): readonly Diagnostic[] {
      return evaluateK8sRules(graph, mode);
    },
  };
}
