---
title: Relationship Guide
description: "ArchLex DSL relationship syntax, including arrows, directions, machine-readable kinds like invokes and publishes, and provider validation rules."
---

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

ArchLex preserves the kind on `CloudEdge`. Provider rules use it to validate
source, target, and placement.

Core recognizes these kinds, grouped by area:

<!-- BEGIN GENERATED RELATIONSHIP KINDS -->
| Area | Kinds |
| --- | --- |
| Connectivity | `connects`, `routes`, `proxies`, `exposes` |
| Dependency | `depends-on`, `attaches` |
| Data | `reads`, `writes`, `caches`, `encrypts`, `decrypts`, `streams`, `stores`, `backs-up`, `restores`, `archives` |
| Events | `publishes`, `subscribes`, `invokes`, `triggers`, `schedules`, `notifies` |
| Operations | `monitors`, `logs`, `traces`, `alerts` |
| Processing | `processes`, `transforms`, `analyzes`, `transcodes`, `packages` |
| Delivery | `orchestrates`, `builds`, `deploys`, `provisions` |
| Governance | `assumes-role`, `protects`, `governs`, `catalogs`, `authenticates`, `authorizes`, `audits`, `scans`, `trusts` |
| Reliability | `fails-over-to` |
| Lifecycle | `replicates`, `migrates`, `discovers` |
<!-- END GENERATED RELATIONSHIP KINDS -->

The area of each kind is part of the language metadata
(`RelationshipDefinition.area`) and is exposed through the catalog API.

## Provider validation

Providers declare which kinds they understand and which services may take part
in them. AWS, Google Cloud, and Kubernetes each ship relationship definitions
with allowed sources and targets; a typed edge that violates them produces a
provider diagnostic (`AWS-RELATIONSHIP-INVALID-ENDPOINT-001`,
`GCP-RELATIONSHIP-INVALID-ENDPOINT-001`,
`K8S-RELATIONSHIP-INVALID-ENDPOINT-001`). In `strict` mode these warnings
become errors; `off` skips them.

For example, AWS declares that `orchestrates` flows from Step Functions to
Lambda, ECS, Glue, or SageMaker, so `dynamodb -[orchestrates]-> lambda` is
flagged while `step-functions -[orchestrates]-> lambda` is accepted.
Kubernetes declares provider-specific `targets` (Service to workload), `routes`
(Ingress to Service), `mounts` (workload to storage/configuration), `binds`
(PersistentVolumeClaim to PersistentVolume), and `scales`
(HorizontalPodAutoscaler to workload), and `schedules-on` (Pod to Node)
relationships.

Use `getCatalog()` to read the current core list and each provider's declared
relationships.

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

events -[triggers]-> worker
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

Kubernetes enforces the declared `routes` (Ingress to Service) and `targets`
(Service to workload) constraints. Untyped edges are still checked
topologically: a Service connected to a workload satisfies the target check
even without a `targets` kind.

## Unknown kinds

ArchLex keeps custom kinds so you can express domain-specific relationships.
Provider validation may emit an informational diagnostic when it cannot evaluate
the kind. The edge still renders.

Use a known kind when you want current provider rules to understand intent. Use
a display label when you only need reader-facing detail.
