import type { CloudGraph, Diagnostic } from "@cloudmer/model";
import { defineRule } from "../builder.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

export const lambdaVpcPlacementRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.LAMBDA_VPC_PLACEMENT,
  severity: "info",
  summary:
    "Lambda function connecting directly to private VPC resources should have VPC configuration.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const lambdas = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "lambda",
    );

    for (const fn of lambdas) {
      const isInsideSubnet = graph.scopes.some(
        (s) =>
          (s.kind === "subnet" || s.kind === "vpc") &&
          s.childrenNodeIds.includes(fn.id),
      );

      const connectsToPrivateResource = graph.edges.some((e) => {
        if (e.source !== fn.id && e.target !== fn.id) return false;
        const otherId = e.source === fn.id ? e.target : e.source;
        const otherNode = graph.nodes.find((n) => n.id === otherId);
        return (
          otherNode &&
          ["rds", "rds-proxy", "elasticache"].includes(
            otherNode.serviceKind.toLowerCase(),
          )
        );
      });

      if (connectsToPrivateResource && !isInsideSubnet) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.LAMBDA_VPC_PLACEMENT,
          severity: "info",
          message: `Lambda function '${fn.id}' connects to private database/cache resources but is not placed inside a VPC subnet scope.`,
          span: fn.span,
          elements: [fn.id],
          remediation:
            "Place the Lambda function inside a subnet container to model VPC Access.",
        });
      }
    }

    return diagnostics;
  },
});
