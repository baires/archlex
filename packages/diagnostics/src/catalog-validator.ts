import type {
  Diagnostic,
  ResourceDefinition,
  SourceSpan,
} from "@archlex/model";
import { CATALOG_DIAGNOSTIC_CODES } from "./registry.js";

export const VALID_RESOURCE_CATEGORIES = [
  "boundary",
  "networking",
  "compute",
  "storage",
  "database",
  "messaging",
  "identity",
  "security",
  "monitoring",
  "integration",
  "analytics",
  "ai-ml",
  "devtools",
  "containers",
  "management",
] as const;

export type ResourceCategory = (typeof VALID_RESOURCE_CATEGORIES)[number];

const ID_FORMAT_REGEX = /^[a-z0-9-]+$/;

const DEFAULT_SPAN: SourceSpan = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

export interface CatalogValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

export function validateCatalogDefinition(
  definition: ResourceDefinition,
): CatalogValidationResult {
  const diagnostics: Diagnostic[] = [];

  // Validate ID format
  if (!definition.id || !ID_FORMAT_REGEX.test(definition.id)) {
    diagnostics.push({
      code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
      severity: "error",
      message: `Invalid resource definition ID '${definition.id}'. ID must consist of lowercase alphanumeric characters and hyphens matching ^[a-z0-9-]+$.`,
      span: DEFAULT_SPAN,
      elements: [definition.id || ""],
      remediation:
        "Ensure the resource definition ID uses only lowercase alphanumeric characters and hyphens.",
    });
  }

  // Validate displayName
  if (!definition.displayName || definition.displayName.trim() === "") {
    diagnostics.push({
      code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
      severity: "error",
      message: `Resource definition '${definition.id}' has empty or whitespace-only displayName.`,
      span: DEFAULT_SPAN,
      elements: [definition.id || ""],
      remediation:
        "Provide a non-empty displayName for the resource definition.",
    });
  }

  // Validate category
  if (
    !definition.category ||
    !VALID_RESOURCE_CATEGORIES.includes(definition.category as ResourceCategory)
  ) {
    diagnostics.push({
      code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
      severity: "error",
      message: `Resource definition '${definition.id}' has invalid category '${definition.category}'. Allowed categories: ${VALID_RESOURCE_CATEGORIES.join(", ")}.`,
      span: DEFAULT_SPAN,
      elements: [definition.id || ""],
      remediation: `Set category to one of: ${VALID_RESOURCE_CATEGORIES.join(", ")}.`,
    });
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
  };
}

export function validateCatalogManifest(
  definitions: Map<string, ResourceDefinition> | readonly ResourceDefinition[],
): CatalogValidationResult {
  const defArray =
    definitions instanceof Map
      ? Array.from(definitions.values())
      : Array.from(definitions);

  const diagnostics: Diagnostic[] = [];
  const seenIds = new Set<string>();
  const seenAliases = new Map<string, string>();

  for (const def of defArray) {
    // Validate individual definition schema/rules
    const defResult = validateCatalogDefinition(def);
    diagnostics.push(...defResult.diagnostics);

    // Duplicate ID check
    if (def.id) {
      if (seenIds.has(def.id)) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Duplicate ID '${def.id}' found in catalog manifest.`,
          span: DEFAULT_SPAN,
          elements: [def.id],
          remediation:
            "Ensure all resource definitions in the manifest have unique IDs.",
        });
      } else {
        seenIds.add(def.id);
      }
    }

    // Duplicate alias check
    const aliases = def.aliases || [];
    for (const alias of aliases) {
      if (seenAliases.has(alias)) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Duplicate alias '${alias}' found on resource '${def.id}' (already registered by '${seenAliases.get(alias)}').`,
          span: DEFAULT_SPAN,
          elements: [def.id, alias],
          remediation:
            "Ensure all resource aliases in the catalog manifest are unique.",
        });
      } else {
        seenAliases.set(alias, def.id);
      }
    }
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
  };
}
