import type { CloudGraph, CloudProvider, Diagnostic } from "@cloudmer/model";

export const AWS_SERVICE_CATALOG = new Set([
  "rds-proxy",
  "rds",
  "ecs",
  "lambda",
  "s3",
  "dynamodb",
  "sqs",
  "sns",
  "api-gateway",
  "cloudfront",
  "vpc",
  "subnet",
]);

export function awsProvider(): CloudProvider {
  return {
    id: "aws",
    name: "Amazon Web Services",
    supports(serviceKind: string): boolean {
      return AWS_SERVICE_CATALOG.has(serviceKind.toLowerCase());
    },
    validateGraph(graph: CloudGraph): readonly Diagnostic[] {
      const diagnostics: Diagnostic[] = [];

      for (const node of graph.nodes) {
        if (!this.supports(node.serviceKind)) {
          diagnostics.push({
            code: "AWS-SEM-001",
            severity: "info",
            message: `Unknown AWS service '${node.serviceKind}'`,
            span: node.span,
            elements: [node.id],
            remediation:
              "Check resource name spelling or provider documentation.",
          });
        }
      }

      return diagnostics;
    },
  };
}
