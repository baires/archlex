import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";
import { WORKLOAD_KINDS, resolveNodeKind } from "./util.js";

export const pvcUnboundRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.PVC_UNBOUND,
  severity: "warning",
  summary:
    "PersistentVolumeClaims should be consumed by at least one workload.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const kindByNodeId = new Map(
      graph.nodes.map((node) => [node.id, resolveNodeKind(node)]),
    );

    for (const node of graph.nodes) {
      if (resolveNodeKind(node) !== "persistentvolumeclaim") continue;

      const isConsumed = graph.edges.some((edge) => {
        if (edge.source !== node.id && edge.target !== node.id) return false;
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const otherKind = kindByNodeId.get(otherId);
        return otherKind !== undefined && WORKLOAD_KINDS.has(otherKind);
      });

      if (!isConsumed) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.PVC_UNBOUND,
          severity: "warning",
          message: `PersistentVolumeClaim '${node.label}' is not consumed by any workload.`,
          span: node.span,
          elements: [node.id],
          remediation:
            "Connect the claim to a workload (e.g. statefulset) that mounts it.",
        });
      }
    }

    return diagnostics;
  },
});
