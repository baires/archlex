import type { CloudGraph, Diagnostic } from "@archlex/model";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: Analytics Rules
 */

/**
 * Kinesis Firehose should have valid destinations (S3, Redshift, OpenSearch)
 */
export const kinesisFirehoseDestinationRule = {
  code: AWS_DIAGNOSTIC_CODES.KINESIS_FIREHOSE_DESTINATION,
  severity: "warning" as const,
  summary:
    "Kinesis Firehose delivery streams should have valid destinations configured.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const firehose = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "kinesis-firehose",
    );

    for (const fh of firehose) {
      const destinationEdges = graph.edges.filter(
        (e) =>
          e.source === fh.id &&
          (e.label?.toLowerCase() === "writes" ||
            e.label?.toLowerCase() === "streams"),
      );

      const validDestinations = destinationEdges.filter((edge) => {
        const target = graph.nodes.find((n) => n.id === edge.target);
        return (
          target &&
          ["s3", "redshift", "opensearch", "elasticsearch"].includes(
            target.serviceKind.toLowerCase(),
          )
        );
      });

      if (validDestinations.length === 0) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.KINESIS_FIREHOSE_DESTINATION,
          severity: "warning",
          message: `Kinesis Firehose '${fh.label}' should write to S3, Redshift, or OpenSearch.`,
          span: fh.span,
          elements: [fh.id],
          remediation:
            "Add a connection to S3, Redshift, or OpenSearch as the delivery destination.",
        });
      }
    }

    return diagnostics;
  },
};

/**
 * EMR clusters should be placed in VPC for network isolation
 */
export const emrVpcPlacementRule = {
  code: AWS_DIAGNOSTIC_CODES.EMR_VPC_PLACEMENT,
  severity: "warning" as const,
  summary:
    "EMR clusters should be launched within a VPC for network isolation.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const emrClusters = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "emr",
    );

    for (const emr of emrClusters) {
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(emr.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.EMR_VPC_PLACEMENT,
          severity: "warning",
          message: `EMR cluster '${emr.label}' should be placed within a VPC scope.`,
          span: emr.span,
          elements: [emr.id],
          remediation:
            "Place EMR cluster in a VPC for network isolation and security.",
        });
      }
    }

    return diagnostics;
  },
};
