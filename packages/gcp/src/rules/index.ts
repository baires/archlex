import type { CloudGraph, Diagnostic, ValidationMode } from "@cloudmer/model";
import { resolveGcpService } from "../catalog/index.js";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

import { cloudSqlNetworkRule } from "./data.js";
import { subnetContainmentRule } from "./networking.js";

export * from "./data.js";
export * from "./networking.js";

export function evaluateGcpRules(
  graph: CloudGraph,
  mode: ValidationMode = "normal",
): readonly Diagnostic[] {
  if (mode === "off") {
    return [];
  }

  const rawDiagnostics: Diagnostic[] = [];

  // Pass 2: Catalog & Provider Validation
  for (const node of graph.nodes) {
    const serviceDef = resolveGcpService(node.serviceKind);
    if (!serviceDef) {
      rawDiagnostics.push({
        code: GCP_DIAGNOSTIC_CODES.UNKNOWN_RESOURCE,
        severity: "info",
        message: `Unknown GCP service '${node.serviceKind}'`,
        span: node.span,
        elements: [node.id],
        remediation: "Check resource name spelling or provider documentation.",
      });
    }
  }

  // Pass 2: Provider Validation Rules
  rawDiagnostics.push(...subnetContainmentRule.validate(graph));

  // Pass 3: Architecture Guidance Rules
  rawDiagnostics.push(...cloudSqlNetworkRule.validate(graph));

  // Policy Mode Handling: strict promotes warnings to errors
  if (mode === "strict") {
    return rawDiagnostics.map((d) => {
      if (d.severity === "warning") {
        return { ...d, severity: "error" as const };
      }
      return d;
    });
  }

  return rawDiagnostics;
}
