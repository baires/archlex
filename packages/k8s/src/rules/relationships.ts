import type {
  CloudGraph,
  Diagnostic,
  RelationshipDefinition,
} from "@archlex/model";
import { defineRule } from "../builder.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";
import { K8S_RELATIONSHIPS } from "../relationships.js";
import { resolveNodeKind } from "./util.js";

/**
 * Typed relationships should connect resources that support the declared
 * kind (e.g. `-[targets]->` only flows from a Service to a workload).
 */
export const relationshipEndpointsRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
  severity: "warning",
  summary:
    "Typed relationships should connect Kubernetes resources that support the relationship kind.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const constrained: readonly RelationshipDefinition[] =
      K8S_RELATIONSHIPS.filter(
        (definition) => definition.allowedSources || definition.allowedTargets,
      );

    for (const edge of graph.edges) {
      if (!edge.kind) continue;
      const definition = constrained.find(({ kind }) => kind === edge.kind);
      if (!definition) continue;

      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) continue;

      // Only enforce pairs where both endpoints are Kubernetes resources.
      const sourceKind = resolveNodeKind(source);
      const targetKind = resolveNodeKind(target);
      if (!sourceKind || !targetKind) continue;

      if (
        definition.allowedSources &&
        !definition.allowedSources.includes(sourceKind)
      ) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
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
          code: K8S_DIAGNOSTIC_CODES.RELATIONSHIP_INVALID_ENDPOINT,
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
