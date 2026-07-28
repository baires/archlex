import type { CloudGraph, Diagnostic } from "@cloudmer/model";
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
