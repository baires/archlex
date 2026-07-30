import type { ResourceDefinition } from "@cloudmer/model";
import { defineService } from "../builder.js";

export const initialServices: ResourceDefinition[] = [
  // Boundaries
  defineService({
    id: "account",
    displayName: "Google Cloud Organization",
    category: "boundary",
    aliases: ["gcp-account", "organization", "folder"],
  }),
  defineService({
    id: "region",
    displayName: "Google Cloud Region",
    category: "boundary",
    aliases: ["gcp-region"],
  }),
  defineService({
    id: "project",
    displayName: "Google Cloud Project",
    category: "boundary",
    aliases: ["gcp.project", "gcp-project"],
  }),

  // Networking
  defineService({
    id: "vpc",
    displayName: "VPC Network",
    category: "networking",
    aliases: ["gcp.vpc", "vpc-network"],
  }),
  defineService({
    id: "subnet",
    displayName: "VPC Subnet",
    category: "networking",
    aliases: ["gcp.subnet"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "cloud-load-balancing",
    displayName: "Cloud Load Balancing",
    category: "networking",
    aliases: ["gcp.cloud-load-balancing", "lb", "load-balancer"],
  }),
  defineService({
    id: "cloud-dns",
    displayName: "Cloud DNS",
    category: "networking",
    aliases: ["gcp.cloud-dns", "dns"],
  }),
  defineService({
    id: "cloud-cdn",
    displayName: "Cloud CDN",
    category: "networking",
    aliases: ["gcp.cloud-cdn", "cdn"],
  }),

  // Compute
  defineService({
    id: "compute-engine",
    displayName: "Compute Engine",
    category: "compute",
    aliases: ["gcp.compute-engine", "gce", "vm"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-run",
    displayName: "Cloud Run",
    category: "compute",
    aliases: ["gcp.cloud-run", "run"],
  }),
  defineService({
    id: "cloud-functions",
    displayName: "Cloud Functions",
    category: "compute",
    aliases: ["gcp.cloud-functions", "functions", "gcf"],
  }),
  defineService({
    id: "gke",
    displayName: "Google Kubernetes Engine",
    category: "compute",
    aliases: ["gcp.gke", "kubernetes"],
    allowedContainment: ["subnet"],
  }),

  // Data
  defineService({
    id: "cloud-sql",
    displayName: "Cloud SQL",
    category: "database",
    aliases: ["gcp.cloud-sql", "sql"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-spanner",
    displayName: "Cloud Spanner",
    category: "database",
    aliases: ["gcp.cloud-spanner", "spanner"],
  }),
  defineService({
    id: "firestore",
    displayName: "Cloud Firestore",
    category: "database",
    aliases: ["gcp.firestore", "firestore-db"],
  }),
  defineService({
    id: "bigtable",
    displayName: "Bigtable",
    category: "database",
    aliases: ["gcp.bigtable", "big-table"],
  }),
  defineService({
    id: "memorystore",
    displayName: "Memorystore",
    category: "database",
    aliases: ["gcp.memorystore", "redis"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-storage",
    displayName: "Cloud Storage",
    category: "storage",
    aliases: ["gcp.cloud-storage", "gcs", "bucket"],
  }),

  // Messaging & Events
  defineService({
    id: "pubsub",
    displayName: "Pub/Sub",
    category: "messaging",
    aliases: ["gcp.pubsub", "pub-sub"],
  }),
  defineService({
    id: "cloud-tasks",
    displayName: "Cloud Tasks",
    category: "messaging",
    aliases: ["gcp.cloud-tasks", "tasks"],
  }),

  // Analytics & AI
  defineService({
    id: "bigquery",
    displayName: "BigQuery",
    category: "analytics",
    aliases: ["gcp.bigquery", "bq"],
  }),
  defineService({
    id: "vertex-ai",
    displayName: "Vertex AI",
    category: "ai",
    aliases: ["gcp.vertex-ai", "vertex"],
  }),

  // Identity & Security
  defineService({
    id: "iam",
    displayName: "Identity and Access Management",
    category: "identity",
    aliases: ["gcp.iam", "identity"],
  }),
  defineService({
    id: "secret-manager",
    displayName: "Secret Manager",
    category: "security",
    aliases: ["gcp.secret-manager", "secrets"],
  }),
];

export const GCP_SERVICE_CATALOG = new Map<string, ResourceDefinition>();
export const GCP_ALIAS_MAP = new Map<string, string>();

for (const service of initialServices) {
  GCP_SERVICE_CATALOG.set(service.id, service);
  GCP_ALIAS_MAP.set(service.id, service.id);
  for (const alias of service.aliases) {
    GCP_ALIAS_MAP.set(alias.toLowerCase(), service.id);
  }
}

export function resolveGcpService(
  kindOrAlias: string,
): ResourceDefinition | undefined {
  const normalized = kindOrAlias.toLowerCase();
  const canonicalId = GCP_ALIAS_MAP.get(normalized) ?? normalized;
  return GCP_SERVICE_CATALOG.get(canonicalId);
}
