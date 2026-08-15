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

Rules inspect only facts present in the graph. They do not infer IAM policy
contents, security group rules, routes, or runtime configuration.

## Validation modes

`normal` preserves provider severities. `strict` promotes provider warnings to
errors while leaving informational diagnostics unchanged. `off` skips AWS
semantic rules but keeps catalog resolution for labels and icons.

## Verification

```bash
pnpm --filter @archlex/aws test
pnpm --filter @archlex/aws icons:check
pnpm validate:catalog
```

Tests cover canonical IDs, aliases, icon integrity, diagnostic codes,
containment, relationships, and all validation modes.
