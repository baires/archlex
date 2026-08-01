import type {
  CloudGraph,
  CloudProvider,
  Diagnostic,
  ServiceMetadata,
  ValidationMode,
} from "@archlex/model";
import { resolveAwsService } from "./catalog/index.js";
import { AWS_SANITIZED_ICONS } from "./icons/manifest.js";
import { evaluateAwsRules } from "./rules/index.js";

export * from "./builder.js";
export * from "./catalog/index.js";
export * from "./icons/manifest.js";
export * from "./registry.js";
export * from "./rules/index.js";

export function awsProvider(): CloudProvider {
  return {
    id: "aws",
    name: "Amazon Web Services",
    catalogVersion: "2026-07-31-tier4",
    supports(serviceKind: string): boolean {
      return resolveAwsService(serviceKind) !== undefined;
    },
    resolveService(serviceKind: string): ServiceMetadata | undefined {
      const def = resolveAwsService(serviceKind);
      if (!def) return undefined;
      const iconKey = `aws.${def.id}`;
      const iconObj = AWS_SANITIZED_ICONS[`aws-${def.id}`];
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
      return evaluateAwsRules(graph, mode);
    },
  };
}
