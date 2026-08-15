import type {
  CloudGraph,
  CloudProvider,
  Diagnostic,
  ServiceMetadata,
  ValidationMode,
} from "@archlex/model";
import { initialServices, resolveAwsService } from "./catalog/index.js";
import { AWS_SANITIZED_ICONS } from "./icons/manifest.js";
import { AWS_RELATIONSHIPS } from "./relationships.js";
import { evaluateAwsRules } from "./rules/index.js";

export * from "./builder.js";
export * from "./catalog/index.js";
export * from "./icons/manifest.js";
export * from "./icons/cdn.js";
export * from "./registry.js";
export * from "./relationships.js";
export * from "./rules/index.js";

export function awsProvider(): CloudProvider {
  return {
    id: "aws",
    name: "Amazon Web Services",
    catalogVersion: "2026-07-31-tier4",
    supportedScopes: ["account", "region", "vpc", "subnet"],
    supports(serviceKind: string): boolean {
      return resolveAwsService(serviceKind) !== undefined;
    },
    resolveService(serviceKind: string): ServiceMetadata | undefined {
      const def = resolveAwsService(serviceKind);
      if (!def) return undefined;
      const iconKey = `aws.${def.id}`;
      const iconObj = AWS_SANITIZED_ICONS[`aws-${def.id}`];

      // Return bundled icon if available
      // For non-bundled icons, callers can use IconLoader.get("aws", def.id) directly
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
    listRelationships() {
      return AWS_RELATIONSHIPS;
    },
    validateGraph(
      graph: CloudGraph,
      mode: ValidationMode = "normal",
    ): readonly Diagnostic[] {
      return evaluateAwsRules(graph, mode);
    },
  };
}
