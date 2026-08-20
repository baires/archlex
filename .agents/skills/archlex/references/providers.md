# Provider Semantics

ArchLex validates diagrams against provider catalogs and semantic rules. The
selected provider decides catalog membership, containment placement, and
relationship validity.

## Validation modes

| Mode | Behavior |
| --- | --- |
| `normal` (default) | Preserves provider severities |
| `strict` | Promotes provider warnings to errors; info unchanged |
| `off` | Skips provider semantic rules; catalog resolution for labels and icons still runs |

Unknown resource kinds remain visible as generic nodes and emit an
informational diagnostic (e.g. `AWS-CATALOG-UNKNOWN-RESOURCE-001`).

## AWS

- Provider ID: `aws`
- Scopes: `account`, `region`, `vpc`, `subnet`
- Catalog: ~194 services across networking, compute, storage, databases,
  security, observability, integration, analytics, AI, developer tools,
  migration, media, IoT, hybrid, and management.

Rules cover catalog membership, relationship kinds, network placement, subnet
containment, security group placement, event targets, analytics destinations,
storage placement, database placement, IAM attachment, and CI/CD stages.
Notable codes:

- `AWS-RDS-PROXY-NETWORK-001`
- `AWS-NETWORKING-SUBNET-CONTAINMENT-001`
- `AWS-INTEGRATION-EVENTBRIDGE-TARGETS-001`
- `AWS-ANALYTICS-KINESIS-FIREHOSE-DESTINATION-001`
- `AWS-DEVTOOLS-CODEPIPELINE-STAGES-001`
- `AWS-DATA-S3-PUBLIC-001` — info when a bucket receives direct CloudFront
  traffic; configure Origin Access Control (OAC).

Rules inspect only facts present in the graph. They do not infer IAM policy
contents, security group rules, routes, or runtime configuration.

## GCP

- Provider ID: `gcp`
- Scopes: cloud scopes (`account`, `region`, `vpc`, `subnet`) as declared by
  catalog containment.

Typical kinds: `cloud-run`, `cloud-functions`, `pubsub`, `bigquery`,
`cloud-storage`, `gke`. Query `get_cloud_catalog` with `gcp` for the current
list.

## Kubernetes

- Provider ID: `k8s`
- Scopes: `cluster`, `namespace`

```archlex
provider k8s

cluster production {
  namespace web {
    edge: ingress
    api_service: service
    api: deployment

    edge -[routes]-> api_service
    api_service -[targets]-> api
  }
}
```

Kubernetes rule checks focus on graph connections, not authored kind names: a
Service connected to a workload satisfies the target check even with a custom
descriptive kind.

## Catalog discovery

Prefer `get_cloud_catalog` over memory when authoring:

- `provider: "aws" | "gcp" | "k8s" | "all"`
- Returns services (canonical IDs and aliases), containment scopes, known
  relationship kinds, and supported directives.

Editor-style fuzzy search works on catalog search terms: "elastic kubernetes"
finds `eks`, "relational" finds `rds` and `aurora`, "serverless compute"
finds `lambda`.
