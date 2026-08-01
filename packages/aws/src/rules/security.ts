import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

export const unattachedIamRoleRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.UNATTACHED_ROLE,
  severity: "warning",
  summary:
    "IAM role is declared without any assumes-role relationship or attached resource.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const roles = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "iam-role",
    );

    for (const role of roles) {
      const isConnected = graph.edges.some(
        (e) => e.source === role.id || e.target === role.id,
      );

      if (!isConnected) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.UNATTACHED_ROLE,
          severity: "warning",
          message: `IAM Role '${role.id}' is declared but not assumed by or connected to any compute/service resource.`,
          span: role.span,
          elements: [role.id],
          remediation:
            "Connect the role using -[assumes-role]-> or remove unattached role declaration.",
        });
      }
    }

    return diagnostics;
  },
});
