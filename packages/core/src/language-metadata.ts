import type { LanguageMetadata, RelationshipArea } from "@archlex/model";

export const ARCHLEX_LANGUAGE_METADATA = {
  directives: [
    {
      name: "provider",
      values: [],
      documentation: "Select the default provider for unqualified resources.",
      snippet: "provider ${1}",
    },
    {
      name: "direction",
      values: ["LR", "RL", "TB", "BT"],
      documentation: "Set the graph layout direction.",
      snippet: "direction ${1|LR,RL,TB,BT|}",
    },
    {
      name: "validation",
      values: ["normal", "strict", "off"],
      documentation: "Set semantic validation behavior.",
      snippet: "validation ${1|normal,strict,off|}",
    },
    {
      name: "theme",
      values: ["light", "dark"],
      documentation: "Set the rendered diagram theme.",
      snippet: "theme ${1|light,dark|}",
    },
  ],
  scopes: [
    {
      kind: "account",
      documentation: "Cloud account or organization scope.",
      snippet: "account ${1:name} {\n  $0\n}",
    },
    {
      kind: "region",
      documentation: "Cloud region scope.",
      snippet: "region ${1:name} {\n  $0\n}",
    },
    {
      kind: "vpc",
      documentation: "Virtual network scope.",
      snippet: "vpc ${1:name} {\n  $0\n}",
    },
    {
      kind: "subnet",
      documentation: "Network subnet scope.",
      snippet: "subnet ${1:name} {\n  $0\n}",
    },
    {
      kind: "cluster",
      documentation: "Kubernetes cluster scope.",
      snippet: "cluster ${1:name} {\n  $0\n}",
    },
    {
      kind: "namespace",
      documentation: "Kubernetes namespace scope.",
      snippet: "namespace ${1:name} {\n  $0\n}",
    },
  ],
  operators: [
    { value: "->", documentation: "Directed relationship." },
    { value: "<-", documentation: "Reverse directed relationship." },
    { value: "<->", documentation: "Bidirectional relationship." },
    { value: "--", documentation: "Undirected relationship." },
    { value: "-.->", documentation: "Dotted directed relationship." },
    { value: ">", documentation: "Short form of ->." },
  ],
  relationships: [
    // Connectivity
    relationship(
      "connectivity",
      "connects",
      "Connects",
      "Generic network or logical connection.",
    ),
    relationship(
      "connectivity",
      "routes",
      "Routes",
      "Routes traffic or work to the target.",
    ),
    relationship(
      "connectivity",
      "proxies",
      "Proxies",
      "Proxies requests to the target.",
    ),
    relationship(
      "connectivity",
      "exposes",
      "Exposes",
      "Makes the target workload or capability available through an endpoint.",
      ["endpoint", "public access", "service exposure"],
    ),
    // Dependency
    relationship(
      "dependency",
      "depends-on",
      "Depends on",
      "Declares that the source requires the target to operate or start.",
      ["dependency", "prerequisite", "requires"],
    ),
    relationship(
      "dependency",
      "attaches",
      "Attaches",
      "Associates the source with a structural resource such as storage or a network interface.",
      ["attachment", "disk", "interface", "association"],
    ),
    // Data
    relationship("data", "reads", "Reads", "Reads data from the target."),
    relationship("data", "writes", "Writes", "Writes data to the target."),
    relationship(
      "data",
      "caches",
      "Caches",
      "Caches target data or responses.",
    ),
    relationship(
      "data",
      "encrypts",
      "Encrypts",
      "Encrypts data with the target.",
    ),
    relationship(
      "data",
      "decrypts",
      "Decrypts",
      "Decrypts data with the target.",
    ),
    relationship(
      "data",
      "streams",
      "Streams",
      "Streams data to or from the target.",
    ),
    relationship("data", "stores", "Stores", "Stores data in the target."),
    relationship(
      "data",
      "backs-up",
      "Backs up",
      "Backs up data to the target.",
    ),
    relationship(
      "data",
      "restores",
      "Restores",
      "Restores data from the target.",
    ),
    relationship(
      "data",
      "archives",
      "Archives",
      "Moves data or artifacts into long-term retention storage.",
      ["retention", "cold storage", "long-term storage"],
    ),
    // Events
    relationship(
      "events",
      "publishes",
      "Publishes",
      "Publishes messages or events to the target.",
    ),
    relationship(
      "events",
      "subscribes",
      "Subscribes",
      "Subscribes to messages or events from the target.",
    ),
    relationship(
      "events",
      "invokes",
      "Invokes",
      "Invokes the target operation or service.",
    ),
    relationship(
      "events",
      "triggers",
      "Triggers",
      "Triggers the target action or workflow.",
    ),
    relationship(
      "events",
      "schedules",
      "Schedules",
      "Schedules work on the target.",
    ),
    relationship(
      "events",
      "notifies",
      "Notifies",
      "Sends notifications to the target.",
    ),
    // Operations
    relationship(
      "operations",
      "monitors",
      "Monitors",
      "Monitors the target resource or signal.",
    ),
    relationship("operations", "logs", "Logs", "Sends logs to the target."),
    relationship(
      "operations",
      "traces",
      "Traces",
      "Sends traces to the target.",
    ),
    relationship(
      "operations",
      "alerts",
      "Alerts",
      "Sends alerts to the target.",
    ),
    // Processing
    relationship(
      "processing",
      "processes",
      "Processes",
      "Processes work received from the target.",
    ),
    relationship(
      "processing",
      "transforms",
      "Transforms",
      "Transforms target data or events.",
    ),
    relationship(
      "processing",
      "analyzes",
      "Analyzes",
      "Analyzes data from the target.",
    ),
    relationship(
      "processing",
      "transcodes",
      "Transcodes",
      "Transcodes target media.",
    ),
    relationship(
      "processing",
      "packages",
      "Packages",
      "Packages the target artifact.",
    ),
    // Delivery
    relationship(
      "delivery",
      "orchestrates",
      "Orchestrates",
      "Coordinates the target workflow or service.",
    ),
    relationship(
      "delivery",
      "builds",
      "Builds",
      "Builds the target artifact or workload.",
    ),
    relationship(
      "delivery",
      "deploys",
      "Deploys",
      "Deploys to the target environment or service.",
    ),
    relationship(
      "delivery",
      "provisions",
      "Provisions",
      "Provisions the target infrastructure or service.",
    ),
    // Governance
    relationship(
      "governance",
      "assumes-role",
      "Assumes role",
      "Assumes the target identity role.",
    ),
    relationship(
      "governance",
      "protects",
      "Protects",
      "Applies protection to the target.",
    ),
    relationship(
      "governance",
      "governs",
      "Governs",
      "Applies governance to the target.",
    ),
    relationship(
      "governance",
      "catalogs",
      "Catalogs",
      "Catalogs target data or resources.",
    ),
    relationship(
      "governance",
      "authenticates",
      "Authenticates",
      "Authenticates against the target identity service.",
    ),
    relationship(
      "governance",
      "authorizes",
      "Authorizes",
      "Authorizes access through the target.",
    ),
    relationship(
      "governance",
      "audits",
      "Audits",
      "Audits the target for compliance or activity.",
    ),
    relationship(
      "governance",
      "scans",
      "Scans",
      "Scans the target for findings or vulnerabilities.",
    ),
    relationship(
      "governance",
      "trusts",
      "Trusts",
      "Establishes identity or principal trust with the target.",
      ["federation", "trust policy", "identity provider"],
    ),
    // Reliability
    relationship(
      "reliability",
      "fails-over-to",
      "Fails over to",
      "Switches service, traffic, or state to a standby target after failure.",
      ["failover", "standby", "disaster recovery", "high availability"],
    ),
    // Lifecycle
    relationship(
      "lifecycle",
      "replicates",
      "Replicates",
      "Replicates state or data to the target.",
    ),
    relationship(
      "lifecycle",
      "migrates",
      "Migrates",
      "Migrates data or workloads to the target.",
    ),
    relationship(
      "lifecycle",
      "discovers",
      "Discovers",
      "Discovers target resources or metadata.",
    ),
  ],
} as const satisfies LanguageMetadata;

function relationship(
  area: RelationshipArea,
  kind: string,
  displayName: string,
  documentation: string,
  searchTerms: readonly string[] = [displayName, documentation],
) {
  return { area, kind, displayName, documentation, searchTerms } as const;
}

export const KNOWN_RELATIONSHIPS = ARCHLEX_LANGUAGE_METADATA.relationships.map(
  ({ kind }) => kind,
);
