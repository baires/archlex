# Google Cloud Semantics

## Provider contract

Register Google Cloud with `gcpProvider()` from `@archlex/gcp` or the core
re-export. The provider ID is `gcp`, and the current catalog version is
`2026-07-31-tier4`.

The catalog covers networking, compute, storage, databases, security,
observability, integration, analytics, AI, developer tools, containers, hybrid,
healthcare, retail, maps, and management services. Use `getCatalog("gcp")` to
inspect current IDs and aliases. Use `archlex validate --catalog` to validate
the packaged catalogs.

Unknown kinds remain visible as generic nodes and emit
`GCP-CATALOG-UNKNOWN-RESOURCE-001`.

## Containment

Google Cloud reuses the cloud scope grammar. An `account` can model an
organization or folder, `region` models regional placement, and `vpc` with
`subnet` models network containment.

```archlex
provider gcp
validation normal

account production {
  region us-central1 {
    vpc application {
      subnet private-a {
        app: cloud-run
        database: cloud-sql
      }
    }
  }
}

app -[connects]-> database
```

## Icons

The package imports official Google Cloud artwork from pinned archives. The
importer resolves supported presentation CSS into SVG attributes before it runs
the shared sanitizer. `GCP_CDN_PROVIDER` supplies pinned, allowlisted mappings
for additional services.

Applications load missing artwork through a browser or Node icon adapter.
Provider import remains free of registration and network side effects.

## Semantic rules

Google Cloud rules cover catalog membership, subnet containment, network
placement, Cloud SQL connectivity, workflow and Eventarc targets, storage
guidance, analytics placement, AI placement, IAP backends, and GKE Autopilot
configuration.

Examples include:

- `GCP-NETWORKING-SUBNET-CONTAINMENT-001`
- `GCP-DATA-CLOUD-SQL-NETWORK-001`
- `GCP-INTEGRATION-WORKFLOWS-TARGETS-001`
- `GCP-IDENTITY-IAP-BACKEND-001`
- `GCP-CONTAINERS-GKE-AUTOPILOT-CONFIG-001`

Rules use only graph facts. They do not infer firewall contents, IAM policy,
peering, or service configuration.

## Validation modes

`normal` preserves provider severities. `strict` promotes warnings to errors
while keeping informational diagnostics. `off` skips Google Cloud semantic
rules but keeps catalog resolution.

## Verification

```bash
pnpm --filter @archlex/gcp test
pnpm --filter @archlex/gcp icons:check
pnpm validate:catalog
```

Tests cover catalog identity, aliases, sanitized icons, pinned CDN definitions,
containment, rules, and all validation modes.
