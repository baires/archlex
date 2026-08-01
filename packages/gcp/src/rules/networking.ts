import type { CloudGraph, Diagnostic } from "@archlex/model";
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

// Tier 1: Cloud NAT VPC Placement
export const cloudNatVpcRule = defineRule({
  code: GCP_DIAGNOSTIC_CODES.CLOUD_NAT_VPC,
  severity: "warning",
  summary: "Cloud NAT should be configured within a VPC.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const nats = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "cloud-nat",
    );

    for (const nat of nats) {
      // Check if Cloud NAT is in a VPC scope
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(nat.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.CLOUD_NAT_VPC,
          severity: "warning",
          message: `Cloud NAT '${nat.label}' should be placed within a VPC scope.`,
          span: nat.span,
          elements: [nat.id],
          remediation:
            "Place Cloud NAT inside a vpc block to indicate VPC association.",
        });
      }
    }

    return diagnostics;
  },
});

// Tier 1: Filestore VPC Placement
export const filestoreVpcRule = defineRule({
  code: GCP_DIAGNOSTIC_CODES.FILESTORE_VPC,
  severity: "warning",
  summary: "Filestore should be in a VPC for network access.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const filestores = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "filestore",
    );

    for (const filestore of filestores) {
      // Check if Filestore is in a subnet (which implies VPC)
      const subnet = graph.scopes.find(
        (s) => s.kind === "subnet" && s.childrenNodeIds.includes(filestore.id),
      );

      if (!subnet) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.FILESTORE_VPC,
          severity: "warning",
          message: `Filestore '${filestore.label}' should be placed within a subnet scope.`,
          span: filestore.span,
          elements: [filestore.id],
          remediation:
            "Place Filestore in a subnet to ensure VPC connectivity.",
        });
      }
    }

    return diagnostics;
  },
});
