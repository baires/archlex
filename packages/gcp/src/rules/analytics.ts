import type { CloudGraph, Diagnostic } from "@archlex/model";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: Analytics Rules
 */

/**
 * Dataproc clusters should be placed in VPC for network isolation
 */
export const dataprocVpcPlacementRule = {
  code: GCP_DIAGNOSTIC_CODES.DATAPROC_VPC_PLACEMENT,
  severity: "warning" as const,
  summary:
    "Dataproc clusters should be launched within a VPC for network isolation.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const dataprocClusters = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "dataproc",
    );

    for (const dataproc of dataprocClusters) {
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(dataproc.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.DATAPROC_VPC_PLACEMENT,
          severity: "warning",
          message: `Dataproc cluster '${dataproc.label}' should be placed within a VPC scope.`,
          span: dataproc.span,
          elements: [dataproc.id],
          remediation:
            "Place Dataproc cluster in a VPC for network isolation and security.",
        });
      }
    }

    return diagnostics;
  },
};
