import type { CloudGraph, Diagnostic } from "@cloudmer/model";
import { defineRule } from "../builder.js";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

const CLOUD_SQL_CLIENT_KINDS = new Set([
  "compute-engine",
  "gke",
  "cloud-run",
  "cloud-functions",
]);

export const cloudSqlNetworkRule = defineRule({
  code: GCP_DIAGNOSTIC_CODES.CLOUD_SQL_NETWORK,
  severity: "warning",
  summary:
    "Cloud SQL instances and their clients should reside in compatible VPC placement.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const instances = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "cloud-sql",
    );
    const clients = graph.nodes.filter((n) =>
      CLOUD_SQL_CLIENT_KINDS.has(n.serviceKind.toLowerCase()),
    );

    for (const instance of instances) {
      const connectedEdges = graph.edges.filter(
        (e) => e.source === instance.id || e.target === instance.id,
      );

      for (const edge of connectedEdges) {
        const otherId = edge.source === instance.id ? edge.target : edge.source;
        const client = clients.find((c) => c.id === otherId);

        if (client) {
          const instanceVpc = graph.scopes.find(
            (s) => s.kind === "vpc" && s.childrenNodeIds.includes(instance.id),
          );
          const clientVpc = graph.scopes.find(
            (s) => s.kind === "vpc" && s.childrenNodeIds.includes(client.id),
          );

          if (instanceVpc && clientVpc && instanceVpc.id !== clientVpc.id) {
            diagnostics.push({
              code: GCP_DIAGNOSTIC_CODES.CLOUD_SQL_NETWORK,
              severity: "warning",
              message: `Cloud SQL instance '${instance.id}' in VPC '${instanceVpc.name}' is connected to '${client.id}' in different VPC '${clientVpc.name}'.`,
              span: instance.span,
              elements: [instance.id, client.id],
              remediation:
                "Place the Cloud SQL instance and its clients in the same VPC, or configure VPC Network Peering / private service access.",
            });
          }
        }
      }
    }

    return diagnostics;
  },
});
