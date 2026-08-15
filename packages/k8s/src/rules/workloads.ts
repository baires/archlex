import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";
import { resolveNodeKind } from "./util.js";

export const unmanagedPodRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.UNMANAGED_POD,
  severity: "warning",
  summary: "Bare Pods should be managed by a controller such as a Deployment.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const node of graph.nodes) {
      if (resolveNodeKind(node) !== "pod") continue;

      diagnostics.push({
        code: K8S_DIAGNOSTIC_CODES.UNMANAGED_POD,
        severity: "warning",
        message: `Pod '${node.label}' is unmanaged; prefer a Deployment, StatefulSet, DaemonSet, or Job.`,
        span: node.span,
        elements: [node.id],
        remediation:
          "Replace the bare pod with a controller (e.g. deployment) so the workload is rescheduled on failure.",
      });
    }

    return diagnostics;
  },
});
