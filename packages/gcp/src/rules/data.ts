import type { CloudGraph, Diagnostic } from "@archlex/model";
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

// Tier 1: AlloyDB Private Service Connect
export const alloyDbPscRule = defineRule({
  code: GCP_DIAGNOSTIC_CODES.ALLOYDB_PSC,
  severity: "info",
  summary: "AlloyDB should use Private Service Connect for VPC connectivity.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const alloyDbs = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "alloydb",
    );

    for (const alloyDb of alloyDbs) {
      // Check if AlloyDB is in a subnet
      const subnet = graph.scopes.find(
        (s) => s.kind === "subnet" && s.childrenNodeIds.includes(alloyDb.id),
      );

      if (!subnet) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.ALLOYDB_PSC,
          severity: "info",
          message: `AlloyDB '${alloyDb.label}' should be placed within a subnet scope to use Private Service Connect.`,
          span: alloyDb.span,
          elements: [alloyDb.id],
          remediation:
            "Place AlloyDB in a subnet and configure Private Service Connect for VPC connectivity.",
        });
      }
    }

    return diagnostics;
  },
});

export const cloudStoragePublicAccessRule = defineRule({
  code: GCP_DIAGNOSTIC_CODES.CLOUD_STORAGE_PUBLIC,
  severity: "info",
  summary: "Cloud Storage bucket connected from Cloud CDN or Internet.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const buckets = graph.nodes.filter((n) =>
      ["cloud-storage", "gcs"].includes(n.serviceKind.toLowerCase()),
    );

    for (const bucket of buckets) {
      const connectsFromCdn = graph.edges.some((e) => {
        if (e.target !== bucket.id) return false;
        const srcNode = graph.nodes.find((n) => n.id === e.source);
        return (
          srcNode &&
          ["cloud-cdn", "cdn"].includes(srcNode.serviceKind.toLowerCase())
        );
      });

      if (connectsFromCdn) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.CLOUD_STORAGE_PUBLIC,
          severity: "info",
          message: `Cloud Storage bucket '${bucket.id}' receives direct Cloud CDN traffic. Ensure uniform bucket-level access and origin authentication are configured.`,
          span: bucket.span,
          elements: [bucket.id],
          remediation:
            "Enforce uniform bucket-level access and restrict public access with Signed URLs or OCI.",
        });
      }
    }

    return diagnostics;
  },
});
