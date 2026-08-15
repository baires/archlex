import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";
import { WORKLOAD_KINDS, resolveNodeKind } from "./util.js";

export const workloadNamespaceContainmentRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.WORKLOAD_NAMESPACE_CONTAINMENT,
  severity: "warning",
  summary: "Workloads should be nested within a namespace container.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const node of graph.nodes) {
      const kind = resolveNodeKind(node);
      if (!kind || !WORKLOAD_KINDS.has(kind)) continue;

      const inNamespace = graph.scopes.some(
        (scope) =>
          scope.kind === "namespace" && scope.childrenNodeIds.includes(node.id),
      );

      if (!inNamespace) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.WORKLOAD_NAMESPACE_CONTAINMENT,
          severity: "warning",
          message: `${node.label} is declared outside of any namespace containment block.`,
          span: node.span,
          elements: [node.id],
          remediation:
            "Nest the workload inside a namespace block: namespace <name> { ... }",
        });
      }
    }

    return diagnostics;
  },
});

export const namespaceClusterContainmentRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.NAMESPACE_CLUSTER_CONTAINMENT,
  severity: "warning",
  summary: "Namespaces should be nested within a cluster container.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const namespaces = graph.scopes.filter((s) => s.kind === "namespace");

    for (const namespace of namespaces) {
      const isInsideCluster =
        namespace.id.includes("/cluster:") ||
        namespace.id.startsWith("cluster:");

      if (!isInsideCluster) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.NAMESPACE_CLUSTER_CONTAINMENT,
          severity: "warning",
          message: `Namespace '${namespace.name}' is declared outside of any cluster containment block.`,
          span: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          elements: [namespace.id],
          remediation:
            "Nest the namespace block inside a cluster block: cluster <name> { namespace <name> { ... } }",
        });
      }
    }

    return diagnostics;
  },
});
