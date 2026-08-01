import type { CloudGraph, Diagnostic } from "@archlex/model";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: Container Rules
 */

/**
 * GKE Autopilot should have proper configuration
 */
export const gkeAutopilotConfigRule = {
  code: GCP_DIAGNOSTIC_CODES.GKE_AUTOPILOT_CONFIG,
  severity: "info" as const,
  summary: "GKE Autopilot clusters should be properly configured.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const autopilot = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "gke-autopilot",
    );

    for (const cluster of autopilot) {
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(cluster.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.GKE_AUTOPILOT_CONFIG,
          severity: "info",
          message: `GKE Autopilot cluster '${cluster.label}' should be placed in a VPC.`,
          span: cluster.span,
          elements: [cluster.id],
          remediation:
            "Place GKE Autopilot cluster in a VPC for network isolation.",
        });
      }
    }

    return diagnostics;
  },
};
