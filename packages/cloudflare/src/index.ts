import type {
  CloudGraph,
  CloudProvider,
  Diagnostic,
  ResourceDefinition,
  ServiceMetadata,
  ValidationMode,
} from "@archlex/model";
import {
  CLOUDFLARE_CATALOG_VERSION,
  initialServices,
  resolveCloudflareService,
} from "./catalog/index.js";

export {
  CLOUDFLARE_ARTWORK_PINS,
  CLOUDFLARE_CATALOG_VERSION,
  initialServices,
  resolveCloudflareService,
  WORKERS_ARTWORK_PIN,
} from "./catalog/index.js";

import { evaluateCloudflareContainment } from "./rules/containment.js";
export { CLOUDFLARE_DIAGNOSTIC_CODES } from "./rules/containment.js";

export { CLOUDFLARE_INCLUDED_IDS } from "./catalog/included-ids.js";

export { CLOUDFLARE_ICONS } from "./icons/generated.js";
import { CLOUDFLARE_ICONS } from "./icons/generated.js";

export function cloudflareProvider(): CloudProvider {
  return {
    id: "cloudflare",
    name: "Cloudflare",
    catalogVersion: CLOUDFLARE_CATALOG_VERSION,
    supportedScopes: ["account"],
    supports(serviceKind: string): boolean {
      return resolveCloudflareService(serviceKind) !== undefined;
    },
    resolveService(serviceKind: string): ServiceMetadata | undefined {
      const service = resolveCloudflareService(serviceKind);
      if (!service) return undefined;
      return {
        id: service.id,
        displayName: service.displayName,
        iconKey: service.iconKey,
        iconSvg: CLOUDFLARE_ICONS[service.id]?.svgFragment,
      };
    },
    listServices(): readonly ResourceDefinition[] {
      return initialServices;
    },
    listRelationships() {
      return [];
    },
    validateGraph(
      graph: CloudGraph,
      mode: ValidationMode = "normal",
    ): readonly Diagnostic[] {
      return evaluateCloudflareContainment(graph, mode);
    },
  };
}
