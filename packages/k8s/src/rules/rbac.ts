import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";
import { BINDING_SUBJECT_KINDS, resolveNodeKind } from "./util.js";

export const bindingSubjectRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.BINDING_SUBJECT,
  severity: "warning",
  summary:
    "RoleBindings and ClusterRoleBindings should grant to a ServiceAccount, User, or Group.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const kindByNodeId = new Map(
      graph.nodes.map((node) => [node.id, resolveNodeKind(node)]),
    );

    for (const node of graph.nodes) {
      const kind = resolveNodeKind(node);
      if (kind !== "rolebinding" && kind !== "clusterrolebinding") continue;

      const hasSubject = graph.edges.some((edge) => {
        if (edge.source !== node.id && edge.target !== node.id) return false;
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const otherKind = kindByNodeId.get(otherId);
        return otherKind !== undefined && BINDING_SUBJECT_KINDS.has(otherKind);
      });

      if (!hasSubject) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.BINDING_SUBJECT,
          severity: "warning",
          message: `'${node.label}' does not grant to any serviceaccount, user, or group.`,
          span: node.span,
          elements: [node.id],
          remediation:
            "Connect the binding to the subject (e.g. serviceaccount) it grants permissions to.",
        });
      }
    }

    return diagnostics;
  },
});
