import type {
  CloudGraph,
  Diagnostic,
  RelationshipDefinition,
} from "@archlex/model";
import { defineRule } from "../builder.js";
import { resolveAwsService } from "../catalog/index.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";
import { AWS_RELATIONSHIPS } from "../relationships.js";

/**
 * Tier 2: Relationship Rules
 */

/**
 * Typed relationships should connect services that support the declared kind.
 */
export const relationshipEndpointsRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
  severity: "warning",
  summary:
    "Typed relationships should connect AWS services that support the relationship kind.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const constrained: readonly RelationshipDefinition[] =
      AWS_RELATIONSHIPS.filter(
        (definition) => definition.allowedSources || definition.allowedTargets,
      );

    for (const edge of graph.edges) {
      if (!edge.kind) continue;
      const definition = constrained.find(({ kind }) => kind === edge.kind);
      if (!definition) continue;

      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) continue;

      // Only enforce pairs where both endpoints are AWS services.
      if (
        !resolveAwsService(source.serviceKind) ||
        !resolveAwsService(target.serviceKind)
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
          code: AWS_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
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
          code: AWS_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
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
});
