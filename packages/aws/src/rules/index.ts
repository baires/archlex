import type { CloudGraph, Diagnostic, ValidationMode } from "@cloudmer/model";
import { resolveAwsService } from "../catalog/index.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

import { sagemakerVpcPlacementRule } from "./ai-ml.js";
import {
  emrVpcPlacementRule,
  kinesisFirehoseDestinationRule,
} from "./analytics.js";
import { lambdaVpcPlacementRule } from "./compute.js";
import { s3PublicAccessGuidanceRule } from "./data.js";
import { codePipelineStagesRule } from "./devtools.js";
import {
  eventBridgeTargetsRule,
  stepFunctionsTargetsRule,
} from "./integration.js";
import {
  igwAttachmentRule,
  natGatewayPlacementRule,
  rdsProxyNetworkRule,
  subnetContainmentRule,
  transitGatewayRoutesRule,
} from "./networking.js";
import { unattachedIamRoleRule } from "./security.js";

export * from "./ai-ml.js";
export * from "./analytics.js";
export * from "./compute.js";
export * from "./data.js";
export * from "./devtools.js";
export * from "./integration.js";
export * from "./networking.js";
export * from "./security.js";

export function evaluateAwsRules(
  graph: CloudGraph,
  mode: ValidationMode = "normal",
): readonly Diagnostic[] {
  if (mode === "off") {
    return [];
  }

  const rawDiagnostics: Diagnostic[] = [];

  // Pass 2: Catalog & Provider Validation
  for (const node of graph.nodes) {
    const serviceDef = resolveAwsService(node.serviceKind);
    if (!serviceDef) {
      rawDiagnostics.push({
        code: AWS_DIAGNOSTIC_CODES.UNKNOWN_RESOURCE,
        severity: "info",
        message: `Unknown AWS service '${node.serviceKind}'`,
        span: node.span,
        elements: [node.id],
        remediation: "Check resource name spelling or provider documentation.",
      });
    }
  }

  // Pass 2: Provider Validation Rules
  rawDiagnostics.push(...rdsProxyNetworkRule.validate(graph));
  rawDiagnostics.push(...subnetContainmentRule.validate(graph));

  // Tier 1: Networking Rules
  rawDiagnostics.push(...natGatewayPlacementRule.validate(graph));
  rawDiagnostics.push(...igwAttachmentRule.validate(graph));
  rawDiagnostics.push(...transitGatewayRoutesRule.validate(graph));

  // Tier 2: Integration Rules
  rawDiagnostics.push(...stepFunctionsTargetsRule.validate(graph));
  rawDiagnostics.push(...eventBridgeTargetsRule.validate(graph));

  // Tier 2: Analytics Rules
  rawDiagnostics.push(...kinesisFirehoseDestinationRule.validate(graph));
  rawDiagnostics.push(...emrVpcPlacementRule.validate(graph));

  // Tier 2: AI/ML Rules
  rawDiagnostics.push(...sagemakerVpcPlacementRule.validate(graph));

  // Tier 2: DevTools Rules
  rawDiagnostics.push(...codePipelineStagesRule.validate(graph));

  // Pass 3: Architecture Guidance Rules
  rawDiagnostics.push(...lambdaVpcPlacementRule.validate(graph));
  rawDiagnostics.push(...s3PublicAccessGuidanceRule.validate(graph));
  rawDiagnostics.push(...unattachedIamRoleRule.validate(graph));

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
