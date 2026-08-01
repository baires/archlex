import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";

export const rdsProxyNetworkRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.RDS_PROXY_NETWORK,
  severity: "error",
  summary:
    "RDS Proxy and its target RDS instance must reside in compatible VPC placement.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const proxies = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "rds-proxy",
    );
    const databases = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "rds",
    );

    for (const proxy of proxies) {
      // Find proxy edges connected to RDS
      const connectedEdges = graph.edges.filter(
        (e) => e.source === proxy.id || e.target === proxy.id,
      );

      for (const edge of connectedEdges) {
        const otherId = edge.source === proxy.id ? edge.target : edge.source;
        const targetDb = databases.find((db) => db.id === otherId);

        if (targetDb) {
          // Check VPC containment scopes
          const proxyVpc = graph.scopes.find(
            (s) => s.kind === "vpc" && s.childrenNodeIds.includes(proxy.id),
          );
          const dbVpc = graph.scopes.find(
            (s) => s.kind === "vpc" && s.childrenNodeIds.includes(targetDb.id),
          );

          if (proxyVpc && dbVpc && proxyVpc.id !== dbVpc.id) {
            diagnostics.push({
              code: AWS_DIAGNOSTIC_CODES.RDS_PROXY_NETWORK,
              severity: "error",
              message: `RDS Proxy '${proxy.id}' in VPC '${proxyVpc.name}' cannot connect to RDS instance '${targetDb.id}' in different VPC '${dbVpc.name}'.`,
              span: proxy.span,
              elements: [proxy.id, targetDb.id],
              remediation:
                "Ensure RDS Proxy and its target RDS database are placed in the same VPC or have VPC peering.",
            });
          }
        }
      }
    }

    return diagnostics;
  },
});

export const subnetContainmentRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.SUBNET_CONTAINMENT,
  severity: "warning",
  summary: "Subnets should be nested within a VPC container.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const subnets = graph.scopes.filter((s) => s.kind === "subnet");
    const vpcs = graph.scopes.filter((s) => s.kind === "vpc");

    for (const subnet of subnets) {
      const isInsideVpc =
        subnet.id.includes("/vpc:") || subnet.id.startsWith("vpc:");

      if (!isInsideVpc) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.SUBNET_CONTAINMENT,
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

// Tier 1: NAT Gateway Placement
export const natGatewayPlacementRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.NAT_GATEWAY_PLACEMENT,
  severity: "warning",
  summary:
    "NAT Gateway should be placed in a public subnet for internet access.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const natGateways = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "nat-gateway",
    );

    for (const natGw of natGateways) {
      // Check if NAT Gateway is in a subnet
      const subnet = graph.scopes.find(
        (s) => s.kind === "subnet" && s.childrenNodeIds.includes(natGw.id),
      );

      if (!subnet) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.NAT_GATEWAY_PLACEMENT,
          severity: "warning",
          message: `NAT Gateway '${natGw.label}' should be placed within a subnet scope.`,
          span: natGw.span,
          elements: [natGw.id],
          remediation:
            "Place NAT Gateway in a public subnet with a route to an Internet Gateway.",
        });
      }
    }

    return diagnostics;
  },
});

// Tier 1: Internet Gateway Attachment
export const igwAttachmentRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.IGW_ATTACHMENT,
  severity: "info",
  summary: "Internet Gateway should be attached to a VPC.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const igws = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "internet-gateway",
    );

    for (const igw of igws) {
      // Check if IGW is in a VPC scope
      const vpc = graph.scopes.find(
        (s) => s.kind === "vpc" && s.childrenNodeIds.includes(igw.id),
      );

      if (!vpc) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.IGW_ATTACHMENT,
          severity: "info",
          message: `Internet Gateway '${igw.label}' should be placed within a VPC scope to indicate attachment.`,
          span: igw.span,
          elements: [igw.id],
          remediation:
            "Place Internet Gateway inside a vpc block to show VPC attachment.",
        });
      }
    }

    return diagnostics;
  },
});

// Tier 1: Transit Gateway Routes
export const transitGatewayRoutesRule = defineRule({
  code: AWS_DIAGNOSTIC_CODES.TRANSIT_GATEWAY_ROUTES,
  severity: "info",
  summary:
    "Transit Gateway should have route table associations or connections.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const tgws = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "transit-gateway",
    );

    for (const tgw of tgws) {
      // Check if TGW has any connections
      const hasConnections = graph.edges.some(
        (e) => e.source === tgw.id || e.target === tgw.id,
      );

      if (!hasConnections) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.TRANSIT_GATEWAY_ROUTES,
          severity: "info",
          message: `Transit Gateway '${tgw.label}' has no connections. Consider adding route table or VPC attachments.`,
          span: tgw.span,
          elements: [tgw.id],
          remediation:
            "Connect Transit Gateway to VPCs, VPN connections, or Direct Connect gateways.",
        });
      }
    }

    return diagnostics;
  },
});
