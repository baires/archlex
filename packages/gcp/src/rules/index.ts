import type { CloudGraph, Diagnostic, ValidationMode } from "@archlex/model";
import { resolveGcpService } from "../catalog/index.js";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

import { aiPlatformVpcPlacementRule } from "./ai-ml.js";
import { dataprocVpcPlacementRule } from "./analytics.js";
import { gkeAutopilotConfigRule } from "./containers.js";
import {
  alloyDbPscRule,
  cloudSqlNetworkRule,
  cloudStoragePublicAccessRule,
} from "./data.js";
import { iapBackendRule } from "./identity.js";
import { eventarcTargetsRule, workflowsTargetsRule } from "./integration.js";
import {
  cloudNatVpcRule,
  filestoreVpcRule,
  subnetContainmentRule,
} from "./networking.js";
import { relationshipEndpointsRule } from "./relationships.js";

export * from "./ai-ml.js";
export * from "./analytics.js";
export * from "./containers.js";
export * from "./data.js";
export * from "./identity.js";
export * from "./integration.js";
export * from "./networking.js";
export * from "./relationships.js";

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

  // Tier 1: Networking Rules
  rawDiagnostics.push(...cloudNatVpcRule.validate(graph));
  rawDiagnostics.push(...filestoreVpcRule.validate(graph));

  // Tier 2: Integration Rules
  rawDiagnostics.push(...workflowsTargetsRule.validate(graph));
  rawDiagnostics.push(...eventarcTargetsRule.validate(graph));

  // Tier 2: Relationship Rules
  rawDiagnostics.push(...relationshipEndpointsRule.validate(graph));

  // Tier 2: Analytics Rules
  rawDiagnostics.push(...dataprocVpcPlacementRule.validate(graph));

  // Tier 2: AI/ML Rules
  rawDiagnostics.push(...aiPlatformVpcPlacementRule.validate(graph));

  // Tier 2: Identity Rules
  rawDiagnostics.push(...iapBackendRule.validate(graph));

  // Tier 2: Container Rules
  rawDiagnostics.push(...gkeAutopilotConfigRule.validate(graph));

  // Pass 3: Architecture Guidance Rules
  rawDiagnostics.push(...cloudSqlNetworkRule.validate(graph));
  rawDiagnostics.push(...alloyDbPscRule.validate(graph));
  rawDiagnostics.push(...cloudStoragePublicAccessRule.validate(graph));

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
