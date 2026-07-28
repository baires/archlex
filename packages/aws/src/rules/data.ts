import type { CloudGraph, Diagnostic } from "@cloudmer/model";
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
