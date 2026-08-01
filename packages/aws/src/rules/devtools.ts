import type { CloudGraph, Diagnostic } from "@archlex/model";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: Developer Tools Rules
 */

/**
 * CodePipeline should have valid source, build, and deploy stages
 */
export const codePipelineStagesRule = {
  code: AWS_DIAGNOSTIC_CODES.CODEPIPELINE_STAGES,
  severity: "info" as const,
  summary:
    "CodePipeline should have valid source, build, and deploy stages configured.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const pipelines = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "codepipeline",
    );

    for (const pipeline of pipelines) {
      const outgoingEdges = graph.edges.filter((e) => e.source === pipeline.id);

      if (outgoingEdges.length === 0) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.CODEPIPELINE_STAGES,
          severity: "info",
          message: `CodePipeline '${pipeline.label}' should connect to CodeBuild, CodeDeploy, or other pipeline stages.`,
          span: pipeline.span,
          elements: [pipeline.id],
          remediation:
            "Add connections to CodeCommit (source), CodeBuild (build), and CodeDeploy (deploy) stages.",
        });
      }
    }

    return diagnostics;
  },
};
