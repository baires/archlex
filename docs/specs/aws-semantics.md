---
title: AWS Semantics
description: "AWS semantics in ArchLex, covering the 194-service catalog, account, region, VPC, and subnet containment, relationship rules, and AWS diagnostic codes."
---

# AWS Semantics

## Provider contract

Register AWS with `awsProvider()` from `@archlex/aws` or the core re-export. The
provider ID is `aws`, and the current catalog version is
`2026-07-31-tier4`.

The catalog covers networking, compute, storage, databases, security,
observability, integration, analytics, AI, developer tools, migration, media,
IoT, hybrid, and management services. Use `getCatalog("aws")` to inspect current
canonical IDs and aliases. Use `archlex validate --catalog` to validate the
packaged catalogs.

All 194 AWS services include **search terms** extracted from display names and descriptions for editor completions. For example:
- Searching "elastic kubernetes" finds Amazon EKS (`eks`)
- Searching "relational" finds Amazon RDS (`rds`) and Amazon Aurora (`aurora`)
- Searching "serverless compute" finds AWS Lambda (`lambda`)

Unknown resource kinds remain visible as generic nodes and emit
`AWS-CATALOG-UNKNOWN-RESOURCE-001`.

## Containment

AWS uses `account`, `region`, `vpc`, and `subnet` scopes. Catalog entries declare
allowed containment where ArchLex has enough information to validate placement.

```archlex
provider aws
validation normal

account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        app: ecs
        proxy: rds-proxy
        database: rds
      }
    }
  }
}

app -[connects]-> proxy
proxy -[connects]-> database
```

## Icons

The package imports official AWS Architecture Icons into deterministic sanitized
fragments for bundled services. `AWS_CDN_PROVIDER` maps additional catalog IDs
to a pinned, allowlisted AWS icon source.

Applications load missing artwork through `@archlex/icons-browser` or
`@archlex/icons-node`. Provider import does not register a loader or start a
request.

## Semantic rules

AWS rules cover catalog membership, relationship kinds, network placement,
subnet containment, security group placement, event targets, analytics
destinations, storage placement, database placement, IAM attachment, and CI/CD
stages.

Examples include:

- `AWS-RDS-PROXY-NETWORK-001`
- `AWS-NETWORKING-SUBNET-CONTAINMENT-001`
- `AWS-INTEGRATION-EVENTBRIDGE-TARGETS-001`
- `AWS-ANALYTICS-KINESIS-FIREHOSE-DESTINATION-001`
- `AWS-DEVTOOLS-CODEPIPELINE-STAGES-001`
- `AWS-RELATIONSHIP-INVALID-ENDPOINT-001`

`AWS-RELATIONSHIP-INVALID-ENDPOINT-001` enforces the declared relationship
definitions (`AWS_RELATIONSHIPS`): a typed edge whose kind lists
`allowedSources`/`allowedTargets` warns when the connected services are not in
those lists. Integration rules (Step Functions, EventBridge, Kinesis Firehose)
match declarative rule tags attached to relationship definitions, not
free-text labels or duplicated kind lists. AWS also constrains routing,
replication, build, deployment, and archival relationships used by the shipped
examples. AWS also declares structural attachment, backend exposure, data-service
failover, and IAM trust endpoints.

Rules inspect only facts present in the graph. They do not infer IAM policy
contents, security group rules, routes, or runtime configuration.

## Validation modes

`normal` preserves provider severities. `strict` promotes provider warnings to
errors while leaving informational diagnostics unchanged. `off` skips AWS
semantic rules but keeps catalog resolution for labels and icons.
