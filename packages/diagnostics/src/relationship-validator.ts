import type {
  Diagnostic,
  RelationshipDefinition,
  ResourceDefinition,
  SourceSpan,
} from "@archlex/model";
import { CATALOG_DIAGNOSTIC_CODES } from "./registry.js";

export const VALID_BOUNDARY_TYPES = [
  "account",
  "region",
  "vpc",
  "subnet",
  "group",
] as const;

export type BoundaryType = (typeof VALID_BOUNDARY_TYPES)[number];

const DEFAULT_SPAN: SourceSpan = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

/**
 * Validates relationship containment and boundary integrity rules across catalog resource definitions.
 * Checks that allowedContainment targets refer to valid registered service IDs or boundary kinds,
 * and detects self-containment loops.
 */
export function validateCatalogContainment(
  services: Map<string, ResourceDefinition> | readonly ResourceDefinition[],
): Diagnostic[] {
  const defArray =
    services instanceof Map
      ? Array.from(services.values())
      : Array.from(services);

  const registeredIds = new Set<string>();
  for (const def of defArray) {
    if (def.id) {
      registeredIds.add(def.id);
    }
  }

  const diagnostics: Diagnostic[] = [];

  for (const def of defArray) {
    if (
      !def.id ||
      !def.allowedContainment ||
      def.allowedContainment.length === 0
    ) {
      continue;
    }

    for (const containerId of def.allowedContainment) {
      // Self-containment loop check
      if (containerId === def.id) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP,
          severity: "error",
          message: `Resource definition '${def.id}' cannot list itself in allowedContainment (self-containment loop).`,
          span: DEFAULT_SPAN,
          elements: [def.id],
          remediation: `Remove '${def.id}' from allowedContainment of '${def.id}'.`,
        });
        continue;
      }

      // Valid boundary or registered service check
      const isValidBoundary = VALID_BOUNDARY_TYPES.includes(
        containerId as BoundaryType,
      );
      const isRegisteredService = registeredIds.has(containerId);

      if (!isValidBoundary && !isRegisteredService) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP,
          severity: "error",
          message: `Resource definition '${def.id}' references non-existent container '${containerId}' in allowedContainment.`,
          span: DEFAULT_SPAN,
          elements: [def.id, containerId],
          remediation: `Ensure '${containerId}' is a valid registered service ID or boundary type (${VALID_BOUNDARY_TYPES.join(", ")}).`,
        });
      }
    }
  }

  return diagnostics;
}

export function validateRelationshipDefinitions(
  services: Map<string, ResourceDefinition> | readonly ResourceDefinition[],
  relationships: readonly RelationshipDefinition[],
): readonly Diagnostic[] {
  const serviceIds = new Set(
    (services instanceof Map
      ? Array.from(services.values())
      : Array.from(services)
    ).map(({ id }) => id),
  );
  const seenKinds = new Set<string>();
  const diagnostics: Diagnostic[] = [];

  for (const relationship of relationships) {
    if (seenKinds.has(relationship.kind)) {
      diagnostics.push({
        code: CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP,
        severity: "error",
        message: `Duplicate relationship kind '${relationship.kind}'.`,
        span: DEFAULT_SPAN,
        elements: [relationship.kind],
        remediation: "Ensure every provider relationship kind is unique.",
      });
    } else {
      seenKinds.add(relationship.kind);
    }

    for (const serviceId of [
      ...(relationship.allowedSources ?? []),
      ...(relationship.allowedTargets ?? []),
    ]) {
      if (!serviceIds.has(serviceId)) {
        diagnostics.push({
          code: CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP,
          severity: "error",
          message: `Relationship '${relationship.kind}' references unknown service '${serviceId}'.`,
          span: DEFAULT_SPAN,
          elements: [relationship.kind, serviceId],
          remediation:
            "Use canonical service IDs from the provider catalog in relationship constraints.",
        });
      }
    }
  }

  return diagnostics;
}
