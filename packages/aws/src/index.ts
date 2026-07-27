import type { CloudGraph, CloudProvider, Diagnostic } from "@cloudmer/model";
import { AWS_SERVICE_CATALOG } from "./catalog/index.js";
import { evaluateAwsRules } from "./rules/index.js";

export * from "./builder.js";
export * from "./catalog/index.js";
export * from "./registry.js";
export * from "./rules/index.js";

export function awsProvider(): CloudProvider {
  return {
    id: "aws",
    name: "Amazon Web Services",
    supports(serviceKind: string): boolean {
      return AWS_SERVICE_CATALOG.has(serviceKind.toLowerCase());
    },
    validateGraph(graph: CloudGraph): readonly Diagnostic[] {
      return evaluateAwsRules(graph);
    },
  };
}
