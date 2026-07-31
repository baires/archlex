import type {
  CloudGraph,
  CloudProvider,
  Diagnostic,
  ServiceMetadata,
  ValidationMode,
} from "@cloudmer/model";
import { resolveGcpService } from "./catalog/index.js";
import { GCP_SANITIZED_ICONS } from "./icons/manifest.js";
import { evaluateGcpRules } from "./rules/index.js";

export * from "./builder.js";
export * from "./catalog/index.js";
export * from "./icons/manifest.js";
export * from "./registry.js";
export * from "./rules/index.js";

export function gcpProvider(): CloudProvider {
  return {
    id: "gcp",
    name: "Google Cloud",
    catalogVersion: "2026-07-31-tier4",
    supports(serviceKind: string): boolean {
      return resolveGcpService(serviceKind) !== undefined;
    },
    resolveService(serviceKind: string): ServiceMetadata | undefined {
      const def = resolveGcpService(serviceKind);
      if (!def) return undefined;
      const iconKey = `gcp.${def.id}`;
      const iconObj = GCP_SANITIZED_ICONS[`gcp-${def.id}`];
      return {
        id: def.id,
        displayName: def.displayName,
        iconKey,
        iconSvg: iconObj ? iconObj.svgFragment : undefined,
      };
    },
    validateGraph(
      graph: CloudGraph,
      mode: ValidationMode = "normal",
    ): readonly Diagnostic[] {
      return evaluateGcpRules(graph, mode);
    },
  };
}
