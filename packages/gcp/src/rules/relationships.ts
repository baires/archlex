import type {
  CloudGraph,
  Diagnostic,
  RelationshipDefinition,
} from "@archlex/model";
import { resolveGcpService } from "../catalog/index.js";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";
import { GCP_RELATIONSHIPS } from "../relationships.js";

/**
 * Tier 2: Relationship Rules
 */

/**
 * Typed relationships should connect services that support the declared kind.
 */
export const relationshipEndpointsRule = {
  code: GCP_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
  severity: "warning" as const,
  summary:
    "Typed relationships should connect GCP services that support the relationship kind.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const constrained: readonly RelationshipDefinition[] =
      GCP_RELATIONSHIPS.filter(
        (definition) => definition.allowedSources || definition.allowedTargets,
      );

    for (const edge of graph.edges) {
      if (!edge.kind) continue;
      const definition = constrained.find(({ kind }) => kind === edge.kind);
      if (!definition) continue;

      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) continue;

      // Only enforce pairs where both endpoints are GCP services.
      if (
        !resolveGcpService(source.serviceKind) ||
        !resolveGcpService(target.serviceKind)
      ) {
        continue;
      }

      const sourceKind = source.serviceKind.toLowerCase();
      const targetKind = target.serviceKind.toLowerCase();

      if (
        definition.allowedSources &&
        !definition.allowedSources.includes(sourceKind)
      ) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
          severity: "warning",
          message: `Relationship '${edge.kind}' is not supported from '${sourceKind}' (expected: ${definition.allowedSources.join(", ")}).`,
          span: edge.span,
          elements: [edge.source, edge.target],
          remediation: `Use a supported source for '${edge.kind}' or choose a different relationship kind.`,
        });
      }

      if (
        definition.allowedTargets &&
        !definition.allowedTargets.includes(targetKind)
      ) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
          severity: "warning",
          message: `Relationship '${edge.kind}' is not supported to '${targetKind}' (expected: ${definition.allowedTargets.join(", ")}).`,
          span: edge.span,
          elements: [edge.source, edge.target],
          remediation: `Use a supported target for '${edge.kind}' or choose a different relationship kind.`,
        });
      }
    }

    return diagnostics;
  },
};
