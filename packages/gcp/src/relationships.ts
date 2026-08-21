import type { RelationshipDefinition } from "@archlex/model";

type GcpRelationshipRuleTag =
  | "workflows-target"
  | "eventarc-target"
  | "iap-backend";

type GcpRelationshipDeclaration = RelationshipDefinition & {
  readonly ruleTags?: readonly GcpRelationshipRuleTag[];
};

/**
 * Declared GCP relationship semantics. Kinds are the canonical core
 * relationship kinds (see `@archlex/core` language metadata);
 * `allowedSources`/`allowedTargets` reference GCP catalog service ids and are
 * enforced by the relationship endpoint rule.
 */
const GCP_RELATIONSHIP_DECLARATIONS: readonly GcpRelationshipDeclaration[] = [
  {
    kind: "orchestrates",
    ruleTags: ["workflows-target"],
    displayName: "Orchestrates",
    documentation: "A Workflows workflow orchestrates the target services.",
    allowedSources: ["workflows", "gke-enterprise"],
    allowedTargets: [
      "cloud-functions",
      "cloud-run",
      "cloud-run-jobs",
      "gke",
      "anthos-vmware",
      "anthos-aws",
    ],
  },
  {
    kind: "invokes",
    ruleTags: ["workflows-target", "eventarc-target"],
    displayName: "Invokes",
    documentation: "Synchronously invokes the target service or function.",
    allowedSources: [
      "api-gateway",
      "cloud-endpoints",
      "cloud-functions",
      "workflows",
      "pubsub",
      "eventarc",
    ],
    allowedTargets: [
      "cloud-functions",
      "cloud-run",
      "cloud-run-jobs",
      "workflows",
    ],
  },
  {
    kind: "triggers",
    ruleTags: ["eventarc-target"],
    displayName: "Triggers",
    documentation: "An event source triggers the target workload.",
    allowedSources: ["eventarc", "cloud-scheduler", "cloud-storage", "pubsub"],
    allowedTargets: [
      "cloud-functions",
      "cloud-run",
      "cloud-run-jobs",
      "workflows",
      "dataflow",
      "document-ai",
    ],
  },
  {
    kind: "publishes",
    displayName: "Publishes",
    documentation: "Publishes messages or events to a topic or event bus.",
    allowedSources: [
      "cloud-functions",
      "cloud-run",
      "compute-engine",
      "cloud-tasks",
      "gke",
    ],
    allowedTargets: ["pubsub", "pubsub-lite", "eventarc"],
  },
  {
    kind: "subscribes",
    displayName: "Subscribes",
    documentation: "Subscribes to messages or events from a topic.",
    allowedSources: ["cloud-functions", "cloud-run", "dataflow"],
    allowedTargets: ["pubsub", "pubsub-lite"],
  },
  {
    kind: "reads",
    displayName: "Reads",
    documentation: "Reads data from the target store.",
    allowedSources: [
      "cloud-functions",
      "cloud-run",
      "compute-engine",
      "dataflow",
    ],
    allowedTargets: [
      "cloud-storage",
      "cloud-sql",
      "firestore",
      "bigtable",
      "cloud-spanner",
      "bigquery",
      "memorystore",
      "retail-api",
    ],
  },
  {
    kind: "writes",
    displayName: "Writes",
    documentation: "Writes data to the target store.",
    allowedSources: [
      "cloud-functions",
      "cloud-run",
      "compute-engine",
      "dataflow",
      "natural-language-ai",
    ],
    allowedTargets: [
      "cloud-storage",
      "cloud-sql",
      "firestore",
      "bigtable",
      "cloud-spanner",
      "bigquery",
    ],
  },
  {
    kind: "streams",
    displayName: "Streams",
    documentation: "Streams records to the target consumer or destination.",
    allowedSources: ["pubsub", "pubsub-lite", "dataflow", "retail-api"],
    allowedTargets: [
      "bigquery",
      "cloud-storage",
      "dataflow",
      "bigtable",
      "recommendations-ai",
    ],
  },
  {
    kind: "caches",
    displayName: "Caches",
    documentation: "Caches data or responses in the target cache.",
    allowedSources: [
      "cloud-functions",
      "cloud-run",
      "compute-engine",
      "recommendations-ai",
    ],
    allowedTargets: ["memorystore"],
  },
  {
    kind: "encrypts",
    displayName: "Encrypts",
    documentation: "Encrypts data with the target key service.",
    allowedSources: [
      "cloud-storage",
      "cloud-sql",
      "bigquery",
      "cloud-functions",
      "cloud-healthcare-api",
    ],
    allowedTargets: ["cloud-kms"],
  },
  {
    kind: "decrypts",
    displayName: "Decrypts",
    documentation: "Decrypts data with the target key service.",
    allowedSources: ["cloud-functions", "cloud-run", "compute-engine"],
    allowedTargets: ["cloud-kms"],
  },
  {
    kind: "proxies",
    ruleTags: ["iap-backend"],
    displayName: "Proxies",
    documentation: "Identity-Aware Proxy proxies requests to backend services.",
    allowedSources: ["iap"],
    allowedTargets: ["cloud-run", "gke", "compute-engine"],
  },
  {
    kind: "monitors",
    displayName: "Monitors",
    documentation: "Monitors metrics and alerts for the target resource.",
    allowedSources: ["cloud-monitoring"],
    allowedTargets: [
      "compute-engine",
      "gke",
      "cloud-run",
      "cloud-functions",
      "cloud-sql",
    ],
  },
  {
    kind: "logs",
    displayName: "Logs",
    documentation: "Sends logs to the target log store.",
    allowedSources: [
      "cloud-functions",
      "cloud-run",
      "compute-engine",
      "gke",
      "api-gateway",
      "cloud-healthcare-api",
    ],
    allowedTargets: ["cloud-logging", "cloud-storage"],
  },
  {
    kind: "routes",
    ruleTags: ["iap-backend"],
    displayName: "Routes",
    documentation: "Routes requests or traffic to a Google Cloud backend.",
    allowedSources: [
      "cloud-load-balancing",
      "cloud-dns",
      "cloud-cdn",
      "api-gateway",
      "iap",
    ],
    allowedTargets: [
      "cloud-run",
      "gke",
      "compute-engine",
      "cloud-storage",
      "cloud-functions",
    ],
  },
  {
    kind: "exposes",
    displayName: "Exposes",
    documentation:
      "A Google Cloud edge service exposes a backend workload or origin.",
    allowedSources: [
      "cloud-load-balancing",
      "api-gateway",
      "cloud-endpoints",
      "cloud-cdn",
      "iap",
    ],
    allowedTargets: [
      "cloud-run",
      "gke",
      "compute-engine",
      "cloud-functions",
      "cloud-storage",
    ],
  },
  {
    kind: "attaches",
    displayName: "Attaches",
    documentation: "A Google Cloud workload attaches storage infrastructure.",
    allowedSources: ["compute-engine", "gke"],
    allowedTargets: ["persistent-disk", "filestore"],
  },
  {
    kind: "fails-over-to",
    displayName: "Fails over to",
    documentation:
      "A primary Google Cloud data service fails over to a standby.",
    allowedSources: ["cloud-sql", "alloydb", "cloud-spanner"],
    allowedTargets: ["cloud-sql", "alloydb", "cloud-spanner"],
  },
  {
    kind: "trusts",
    displayName: "Trusts",
    documentation:
      "A Google Cloud identity boundary trusts an identity provider.",
    allowedSources: ["account", "iam"],
    allowedTargets: [
      "cloud-identity",
      "cloud-identity-engine",
      "identity-platform",
      "workforce-identity-federation",
    ],
  },
];

export const GCP_RELATIONSHIPS: readonly RelationshipDefinition[] =
  GCP_RELATIONSHIP_DECLARATIONS.map(
    ({ ruleTags: _ruleTags, ...definition }) => definition,
  );

export function matchesGcpRelationshipRule(
  kind: string | undefined,
  ruleTag: GcpRelationshipRuleTag,
): boolean {
  if (!kind) return false;
  const declaration = GCP_RELATIONSHIP_DECLARATIONS.find(
    (relationship) => relationship.kind === kind,
  );
  return (
    declaration?.ruleTags?.some((candidate) => candidate === ruleTag) ?? false
  );
}
