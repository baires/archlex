import type { CloudGraph, Diagnostic } from "@archlex/model";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: AI/ML Rules
 */

/**
 * AI Platform should be in VPC for private training and inference
 */
export const aiPlatformVpcPlacementRule = {
  code: GCP_DIAGNOSTIC_CODES.AI_PLATFORM_VPC_PLACEMENT,
  severity: "info" as const,
  summary:
    "AI Platform should be placed in VPC for private training and inference.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const aiPlatform = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "ai-platform",
    );

    for (const ai of aiPlatform) {
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(ai.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.AI_PLATFORM_VPC_PLACEMENT,
          severity: "info",
          message: `AI Platform '${ai.label}' can be placed in VPC for enhanced security.`,
          span: ai.span,
          elements: [ai.id],
          remediation:
            "Consider placing AI Platform in VPC for private training and inference workloads.",
        });
      }
    }

    return diagnostics;
  },
};
