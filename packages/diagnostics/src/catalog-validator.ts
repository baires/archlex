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

function normalizeDiscoveryTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[._\s-]+/g, " ");
}

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
  const canonicalIds = new Set<string>();
  const seenAliases = new Map<string, string>();

  for (const def of defArray) {
    if (def.id) canonicalIds.add(normalizeDiscoveryTerm(def.id));
  }

  const encounteredIds = new Set<string>();

  for (const def of defArray) {
    // Validate individual definition schema/rules
    const defResult = validateCatalogDefinition(def);
    diagnostics.push(...defResult.diagnostics);

    // Duplicate ID check
    if (def.id) {
      if (encounteredIds.has(def.id)) {
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
        encounteredIds.add(def.id);
      }
    }

    // Duplicate alias check
    const aliases = def.aliases || [];
    for (const alias of aliases) {
      const normalizedAlias = normalizeDiscoveryTerm(alias);
      if (!normalizedAlias) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Resource '${def.id}' contains an empty alias.`,
          span: DEFAULT_SPAN,
          elements: [def.id, alias],
          remediation: "Remove empty aliases from the resource definition.",
        });
      } else if (
        canonicalIds.has(normalizedAlias) &&
        normalizedAlias !== normalizeDiscoveryTerm(def.id)
      ) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Alias '${alias.trim().toLowerCase()}' on resource '${def.id}' conflicts with a canonical resource ID.`,
          span: DEFAULT_SPAN,
          elements: [def.id, normalizedAlias],
          remediation:
            "Choose an alias that does not match another canonical resource ID.",
        });
      } else if (seenAliases.has(normalizedAlias)) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Duplicate alias '${alias.trim().toLowerCase()}' found on resource '${def.id}' (already registered by '${seenAliases.get(normalizedAlias)}').`,
          span: DEFAULT_SPAN,
          elements: [def.id, normalizedAlias],
          remediation:
            "Ensure all resource aliases in the catalog manifest are unique.",
        });
      } else {
        seenAliases.set(normalizedAlias, def.id);
      }
    }

    const seenSearchTerms = new Set<string>();
    for (const searchTerm of def.searchTerms ?? []) {
      const normalizedSearchTerm = normalizeDiscoveryTerm(searchTerm);
      if (!normalizedSearchTerm) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Resource '${def.id}' contains an empty search term.`,
          span: DEFAULT_SPAN,
          elements: [def.id, searchTerm],
          remediation:
            "Remove empty search terms from the resource definition.",
        });
      } else if (seenSearchTerms.has(normalizedSearchTerm)) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
          severity: "error",
          message: `Duplicate search term '${normalizedSearchTerm}' found on resource '${def.id}'.`,
          span: DEFAULT_SPAN,
          elements: [def.id, normalizedSearchTerm],
          remediation:
            "Ensure each resource has unique normalized search terms.",
        });
      } else {
        seenSearchTerms.add(normalizedSearchTerm);
      }
    }
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
  };
}
