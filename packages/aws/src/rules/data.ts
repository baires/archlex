import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

export const s3PublicAccessGuidanceRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.S3_PUBLIC_ACCESS_GUIDANCE,
  severity: "info",
  summary: "S3 Bucket connected directly from CloudFront/Internet.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const buckets = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "s3",
    );

    for (const bucket of buckets) {
      const connectsFromCloudfront = graph.edges.some((e) => {
        if (e.target !== bucket.id) return false;
        const srcNode = graph.nodes.find((n) => n.id === e.source);
        return srcNode && srcNode.serviceKind.toLowerCase() === "cloudfront";
      });

      if (connectsFromCloudfront) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.S3_PUBLIC_ACCESS_GUIDANCE,
          severity: "info",
          message: `S3 Bucket '${bucket.id}' receives direct CloudFront traffic. Ensure Origin Access Control (OAC) is configured.`,
          span: bucket.span,
          elements: [bucket.id],
          remediation: "Restrict S3 bucket policy to CloudFront OAC principal.",
        });
      }
    }

    return diagnostics;
  },
});

/**
 * EFS file system should be placed within a VPC scope.
 */
export const efsVpcPlacementRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.EFS_VPC_PLACEMENT,
  severity: "warning",
  summary: "EFS file systems should be launched within a VPC container.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const efsNodes = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "efs",
    );

    for (const efs of efsNodes) {
      const isInsideVpc = graph.scopes.some(
        (s) =>
          (s.kind === "vpc" || s.kind === "subnet") &&
          s.childrenNodeIds.includes(efs.id),
      );

      if (!isInsideVpc) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.EFS_VPC_PLACEMENT,
          severity: "warning",
          message: `EFS file system '${efs.label}' should be placed within a VPC scope.`,
          span: efs.span,
          elements: [efs.id],
          remediation:
            "Place EFS file system inside a VPC scope for network isolation.",
        });
      }
    }

    return diagnostics;
  },
});

/**
 * Aurora database should be placed within a subnet or VPC scope.
 */
export const auroraSubnetPlacementRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.AURORA_SUBNET_PLACEMENT,
  severity: "warning",
  summary:
    "Aurora database instances should be placed within a subnet container.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const auroraNodes = graph.nodes.filter(
      (n) =>
        n.serviceKind.toLowerCase() === "aurora" ||
        n.serviceKind.toLowerCase().includes("aurora"),
    );

    for (const db of auroraNodes) {
      const isContained = graph.scopes.some(
        (s) =>
          (s.kind === "subnet" || s.kind === "vpc") &&
          s.childrenNodeIds.includes(db.id),
      );

      if (!isContained) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.AURORA_SUBNET_PLACEMENT,
          severity: "warning",
          message: `Aurora database '${db.label}' should be placed within a subnet or VPC scope.`,
          span: db.span,
          elements: [db.id],
          remediation:
            "Place Aurora database inside a subnet container to ensure network isolation.",
        });
      }
    }

    return diagnostics;
  },
});
