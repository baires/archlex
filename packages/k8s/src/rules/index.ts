import type { CloudGraph, Diagnostic, ValidationMode } from "@archlex/model";
import { resolveK8sService } from "../catalog/index.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";

import {
  namespaceClusterContainmentRule,
  workloadNamespaceContainmentRule,
} from "./namespaces.js";
import { ingressTargetRule, serviceTargetRule } from "./networking.js";
import { bindingSubjectRule } from "./rbac.js";
import { relationshipEndpointsRule } from "./relationships.js";
import { pvcUnboundRule } from "./storage.js";
import { unmanagedPodRule } from "./workloads.js";

export * from "./namespaces.js";
export * from "./networking.js";
export * from "./rbac.js";
export * from "./relationships.js";
export * from "./storage.js";
export * from "./workloads.js";

export function evaluateK8sRules(
  graph: CloudGraph,
  mode: ValidationMode = "normal",
): readonly Diagnostic[] {
  if (mode === "off") {
    return [];
  }

  const rawDiagnostics: Diagnostic[] = [];

  // Pass 2: Catalog & Provider Validation
  for (const node of graph.nodes) {
    const serviceDef = resolveK8sService(node.serviceKind);
    if (!serviceDef) {
      rawDiagnostics.push({
        code: K8S_DIAGNOSTIC_CODES.UNKNOWN_RESOURCE,
        severity: "info",
        message: `Unknown Kubernetes resource '${node.serviceKind}'`,
        span: node.span,
        elements: [node.id],
        remediation: "Check resource name spelling or provider documentation.",
      });
    }
  }

  // Pass 2: Provider Validation Rules
  rawDiagnostics.push(...namespaceClusterContainmentRule.validate(graph));
  rawDiagnostics.push(...workloadNamespaceContainmentRule.validate(graph));

  // Pass 2: Networking Rules
  rawDiagnostics.push(...serviceTargetRule.validate(graph));
  rawDiagnostics.push(...ingressTargetRule.validate(graph));
  rawDiagnostics.push(...relationshipEndpointsRule.validate(graph));

  // Pass 2: Storage Rules
  rawDiagnostics.push(...pvcUnboundRule.validate(graph));

  // Pass 2: RBAC Rules
  rawDiagnostics.push(...bindingSubjectRule.validate(graph));

  // Pass 3: Architecture Guidance Rules
  rawDiagnostics.push(...unmanagedPodRule.validate(graph));

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
