import type { CloudGraph, Diagnostic } from "@cloudmer/model";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: AI/ML Rules
 */

/**
 * SageMaker endpoints should be in VPC for private training and inference
 */
export const sagemakerVpcPlacementRule = {
  code: AWS_DIAGNOSTIC_CODES.SAGEMAKER_VPC_PLACEMENT,
  severity: "info" as const,
  summary:
    "SageMaker endpoints should be placed in VPC for private training and inference.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const sagemaker = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "sagemaker",
    );

    for (const sm of sagemaker) {
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(sm.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.SAGEMAKER_VPC_PLACEMENT,
          severity: "info",
          message: `SageMaker endpoint '${sm.label}' can be placed in VPC for enhanced security.`,
          span: sm.span,
          elements: [sm.id],
          remediation:
            "Consider placing SageMaker endpoints in VPC for private training and inference workloads.",
        });
      }
    }

    return diagnostics;
  },
};
