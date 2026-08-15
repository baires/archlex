import type { LanguageMetadata } from "@archlex/model";

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
    relationship(
      "connects",
      "Connects",
      "Generic network or logical connection.",
    ),
    relationship("reads", "Reads", "Reads data from the target."),
    relationship("writes", "Writes", "Writes data to the target."),
    relationship(
      "publishes",
      "Publishes",
      "Publishes messages or events to the target.",
    ),
    relationship(
      "subscribes",
      "Subscribes",
      "Subscribes to messages or events from the target.",
    ),
    relationship(
      "invokes",
      "Invokes",
      "Invokes the target operation or service.",
    ),
    relationship("routes", "Routes", "Routes traffic or work to the target."),
    relationship(
      "replicates",
      "Replicates",
      "Replicates state or data to the target.",
    ),
    relationship(
      "assumes-role",
      "Assumes role",
      "Assumes the target identity role.",
    ),
    relationship("encrypts", "Encrypts", "Encrypts data with the target."),
    relationship("decrypts", "Decrypts", "Decrypts data with the target."),
    relationship(
      "monitors",
      "Monitors",
      "Monitors the target resource or signal.",
    ),
    relationship("logs", "Logs", "Sends logs to the target."),
    relationship("caches", "Caches", "Caches target data or responses."),
    relationship("proxies", "Proxies", "Proxies requests to the target."),
    relationship("traces", "Traces", "Sends traces to the target."),
    relationship("alerts", "Alerts", "Sends alerts to the target."),
    relationship(
      "processes",
      "Processes",
      "Processes work received from the target.",
    ),
    relationship(
      "transforms",
      "Transforms",
      "Transforms target data or events.",
    ),
    relationship(
      "orchestrates",
      "Orchestrates",
      "Coordinates the target workflow or service.",
    ),
    relationship(
      "triggers",
      "Triggers",
      "Triggers the target action or workflow.",
    ),
    relationship("schedules", "Schedules", "Schedules work on the target."),
    relationship("builds", "Builds", "Builds the target artifact or workload."),
    relationship(
      "deploys",
      "Deploys",
      "Deploys to the target environment or service.",
    ),
    relationship("analyzes", "Analyzes", "Analyzes data from the target."),
    relationship("transcodes", "Transcodes", "Transcodes target media."),
    relationship("packages", "Packages", "Packages the target artifact."),
    relationship(
      "migrates",
      "Migrates",
      "Migrates data or workloads to the target.",
    ),
    relationship(
      "discovers",
      "Discovers",
      "Discovers target resources or metadata.",
    ),
    relationship("catalogs", "Catalogs", "Catalogs target data or resources."),
    relationship("protects", "Protects", "Applies protection to the target."),
    relationship("governs", "Governs", "Applies governance to the target."),
  ],
} as const satisfies LanguageMetadata;

function relationship(
  kind: string,
  displayName: string,
  documentation: string,
) {
  return { kind, displayName, documentation } as const;
}

export const KNOWN_RELATIONSHIPS = ARCHLEX_LANGUAGE_METADATA.relationships.map(
  ({ kind }) => kind,
);
