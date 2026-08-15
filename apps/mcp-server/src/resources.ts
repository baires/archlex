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
- Typed relationship with label: \`alb -> ecs -[writes]->|SQL| rds\`
- Bi-directional or custom arrows: \`client <-> alb\`

## Containment Scopes (Nested Blocks)
\`\`\`
vpc: dev {
  subnet: public {
    apigateway > lambda
  }
  subnet: private {
    rds-proxy > rds
  }
}
\`\`\`

Kubernetes diagrams use \`cluster\` and \`namespace\` blocks in the same way.
`;

export const ARCHLEX_EXAMPLES = {
  "aws-microservices": `direction LR
provider aws

vpc: production {
  subnet: public {
    apigateway["API Gateway"] > lambda["Auth Service"]
  }
  subnet: private {
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
    frontend -[calls]-> api_service
    api_service -[targets]-> api
  }
}`,
};
