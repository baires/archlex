import type { CloudGraph, Diagnostic } from "@cloudmer/model";
import { defineRule } from "../builder.js";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

export const subnetContainmentRule = defineRule({
  code: GCP_DIAGNOSTIC_CODES.SUBNET_CONTAINMENT,
  severity: "warning",
  summary: "Subnets should be nested within a VPC network container.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const subnets = graph.scopes.filter((s) => s.kind === "subnet");

    for (const subnet of subnets) {
      const isInsideVpc =
        subnet.id.includes("/vpc:") || subnet.id.startsWith("vpc:");

      if (!isInsideVpc) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.SUBNET_CONTAINMENT,
          severity: "warning",
          message: `Subnet '${subnet.name}' is declared outside of any VPC containment block.`,
          span: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          elements: [subnet.id],
          remediation:
            "Nest the subnet block inside a vpc block: vpc <name> { subnet <name> { ... } }",
        });
      }
    }

    return diagnostics;
  },
});
