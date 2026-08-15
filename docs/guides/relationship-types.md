# Relationship Guide

## Choose syntax

Use an arrow to describe direction and line style:

| Syntax | Meaning |
| --- | --- |
| `a > b` | Shorthand forward edge |
| `a -> b` | Forward edge |
| `a <- b` | Reverse edge |
| `a <-> b` | Bidirectional edge |
| `a -- b` | Undirected edge |
| `a -.-> b` | Dotted forward edge |

Direction affects semantics. The `direction` document directive affects layout
only.

## Add a machine-readable kind

Place a kind inside square brackets:

```archlex
api -[invokes]-> worker
worker -[writes]-> database
database -[replicates]-> replica
```

ArchLex preserves the kind on `CloudEdge`. Provider rules can use it to validate
source, target, and placement.

Core recognizes these kinds:

| Area | Kinds |
| --- | --- |
| Connectivity | `connects`, `routes`, `proxies` |
| Data | `reads`, `writes`, `caches`, `encrypts`, `decrypts` |
| Events | `publishes`, `subscribes`, `invokes`, `triggers`, `schedules` |
| Operations | `monitors`, `logs`, `traces`, `alerts` |
| Processing | `processes`, `transforms`, `analyzes`, `transcodes`, `packages` |
| Delivery | `orchestrates`, `builds`, `deploys` |
| Governance | `assumes-role`, `protects`, `governs`, `catalogs` |
| Lifecycle | `replicates`, `migrates`, `discovers` |

A provider may validate only the kinds that matter for its current rules. Use
the catalog API to read the current core list.

## Add display text

Use pipe syntax when readers need protocol or route detail:

```archlex
api -[writes]->|PostgreSQL over TLS| database
```

The kind remains `writes`. The renderer displays `PostgreSQL over TLS`. Labels
do not change provider semantics.

## Build chains

```archlex
gateway -[invokes]-> worker -[writes]-> database
```

The chain creates two edges. Each operator owns the relationship that follows
it. Name repeated resources when one diagram needs several instances of a kind.

## Provider examples

### AWS

```archlex
provider aws

gateway: api-gateway
worker: lambda
queue: sqs

gateway -[invokes]-> worker
worker -[publishes]-> queue
```

### Google Cloud

```archlex
provider gcp

events: pubsub
worker: cloud-functions
warehouse: bigquery

events -[invokes]-> worker
worker -[writes]-> warehouse
```

### Kubernetes

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

Kubernetes rule checks focus on graph connections, not authored kind names. A
Service connected to a workload satisfies the target check even when you use a
custom descriptive kind.

## Unknown kinds

ArchLex keeps custom kinds so you can express domain-specific relationships.
Provider validation may emit an informational diagnostic when it cannot evaluate
the kind. The edge still renders.

Use a known kind when you want current provider rules to understand intent. Use
a display label when you only need reader-facing detail.
