import { ARCHLEX_LANGUAGE_METADATA } from "@archlex/core";

const AREA_LABELS: Record<string, string> = {
  connectivity: "Connectivity",
  data: "Data",
  events: "Events",
  operations: "Operations",
  processing: "Processing",
  delivery: "Delivery",
  governance: "Governance",
  lifecycle: "Lifecycle",
};

const AREA_ORDER = Object.keys(AREA_LABELS);

function relationshipKindsSection(): string {
  const byArea = new Map<string, string[]>();
  for (const { kind, area } of ARCHLEX_LANGUAGE_METADATA.relationships) {
    const list = byArea.get(area ?? "") ?? [];
    list.push(`\`${kind}\``);
    byArea.set(area ?? "", list);
  }
  return [...byArea.entries()]
    .sort(([a], [b]) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b))
    .map(
      ([area, kinds]) => `- ${AREA_LABELS[area] ?? area}: ${kinds.join(", ")}`,
    )
    .join("\n");
}

export const ARCHLEX_SYNTAX_GUIDE = `# ArchLex DSL Syntax Guide

ArchLex uses a concise text language for declaring cloud infrastructure architecture diagrams.

## Directives (placed at top of document)
- \`provider aws\`, \`provider gcp\`, or \`provider k8s\`
- \`direction LR\` (Left-to-Right), \`RL\`, \`TB\` (Top-to-Bottom), or \`BT\`
- \`validation normal\` (default), \`strict\`, or \`off\`

## Resource Node Declarations
- Shorthand resource node: \`rds-proxy\` or \`lambda\`
- Named instance node: \`api: lambda\`
- Custom display label: \`primary: rds["Primary DB"]\`
- Fully qualified provider prefix: \`aws.rds\`, \`gcp.gke\`, or \`k8s.deployment\`

## Relationships / Edges
- Forward connection shorthand: \`rds-proxy > rds > ecs\`
- Arrow connection: \`rds-proxy -> rds\`
- Typed relationship: \`api -[writes]-> database\`
- Typed relationship with display label: \`api -[writes]->|PostgreSQL over TLS| database\`
- Bi-directional or custom arrows: \`client <-> alb\`

**Important**: \`-[kind]->\` takes exactly ONE lowercase machine-readable token
(no spaces, no slashes). Free text ONLY goes inside \`|pipes|\`. Common parse
errors come from writing \`-[serves static]->\` — write
\`-[routes]->|serves static|\` instead.

Known relationship kinds:
${relationshipKindsSection()}

## Containment Scopes (Nested Blocks)
\`\`\`
vpc dev {
  subnet public {
    api-gateway > lambda
  }
  subnet private {
    rds-proxy > rds
  }
}
\`\`\`

Kubernetes diagrams use \`cluster\` and \`namespace\` blocks in the same way.

## Recommended workflow
1. Call \`get_cloud_catalog\` to discover exact service names (e.g. \`ecs\`,
   \`ebs\`, \`alb\`) before authoring — guessing names is the top cause of
   validation errors.
2. Iterate with \`validate_diagram\` until it reports 0 errors.
3. Call \`render_diagram\` once the source validates.
`;

export const ARCHLEX_EXAMPLES = {
  "aws-microservices": `direction LR
provider aws

vpc production {
  subnet public {
    api-gateway["API Gateway"] > lambda["Auth Service"]
  }
  subnet private {
    lambda["Auth Service"] -[writes]-> dynamodb["Users Table"]
    lambda["Auth Service"] -[publishes]-> sns["User Events"]
  }
}`,
  "gcp-data-pipeline": `direction LR
provider gcp

pubsub["Ingest Stream"] > cloud-functions["Process Function"]
cloud-functions["Process Function"] -[writes]-> bigquery["Analytics DB"]
cloud-functions["Process Function"] -[logs]-> cloud-storage["Audit Logs"]`,
  "k8s-microservices": `direction LR
provider k8s

cluster production {
  namespace web {
    gateway: ingress
    frontend_service: service
    frontend: deployment
    api_service: service
    api: deployment

    gateway -[routes]-> frontend_service
    frontend_service -[targets]-> frontend
    frontend -[invokes]-> api_service
    api_service -[targets]-> api
  }
}`,
};
