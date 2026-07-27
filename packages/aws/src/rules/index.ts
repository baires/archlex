import type { CloudGraph, Diagnostic } from "@cloudmer/model";
import { AWS_SERVICE_CATALOG } from "../catalog/index.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

export function evaluateAwsRules(graph: CloudGraph): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const node of graph.nodes) {
    if (!AWS_SERVICE_CATALOG.has(node.serviceKind.toLowerCase())) {
      diagnostics.push({
        code: AWS_DIAGNOSTIC_CODES.UNKNOWN_RESOURCE,
        severity: "info",
        message: `Unknown AWS service '${node.serviceKind}'`,
        span: node.span,
        elements: [node.id],
        remediation: "Check resource name spelling or provider documentation.",
      });
    }
  }

  return diagnostics;
}
