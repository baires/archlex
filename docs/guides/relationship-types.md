# Relationship Type Usage Guide

## Introduction

In CloudMer, relationships represent how services interact with each other in your cloud architecture. Choosing the right relationship type is crucial for semantic accuracy—it helps you and your team understand your system's actual behavior, enables better validation, and makes your diagrams communicate intent clearly.

CloudMer provides 9 built-in **neutral relationship kinds** that cover the most common interaction patterns:

| Relationship Kind | Semantic Meaning | Direction |
|------------------|------------------|-----------|
| `connects` | Generic connectivity (fallback for ambiguous or multi-operation edges) | Bidirectional or unspecified |
| `reads` | Read-only data retrieval from storage, cache, or database | Target → Source (data flows from target to source) |
| `writes` | Data mutation, insertion, deletion, or updates to storage | Source → Target (data flows from source to target) |
| `publishes` | Asynchronous message/event emission to topic, queue, or event bus | Source → Target |
| `subscribes` | Receiving/consuming messages from queue, topic, or stream | Source subscribes to Target |
| `invokes` | Synchronous function call, API request, or RPC with expected response | Source → Target |
| `routes` | Traffic distribution, load balancing, proxying, or API gateway routing | Source → Target |
| `replicates` | Data synchronization, cross-region replication, or backup workflows | Source → Target |
| `assumes-role` | Identity delegation, IAM role assumption, permission granting | Source assumes role from Target |

In addition to these built-in types, you can define **custom relationship kinds** for domain-specific semantics (e.g., `-[authenticates]->`, `-[monitors]->`).

---

## Core Concepts

### Relationship Directionality

Relationships in CloudMer are **directional**. The arrow indicates the direction of the interaction:

- **Source service**: The initiator or origin of the relationship (left side of the arrow).
- **Target service**: The recipient or destination of the relationship (right side of the arrow).

For example:
- `api -[invokes]-> function` means the API service invokes the function.
- `database <-[reads]- api` means the API reads from the database (semantically, data flows from database to API).

### Built-in Neutral Kinds vs Custom Kinds

- **Built-in neutral kinds** (`connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, `assumes-role`) are recognized by CloudMer's validation engine and provide provider-specific semantic validation.
- **Custom kinds** (e.g., `-[authenticates]->`) offer precise domain-specific semantics but receive only structural validation and an info-level diagnostic (`AWS-RELATIONSHIP-UNKNOWN-KIND`).

### Relationship Kind vs Presentation Label

CloudMer distinguishes between:
- **Relationship kind**: The semantic type specified in brackets, e.g., `-[reads]->`.
- **Presentation label**: Optional display text shown on the rendered arrow, e.g., `->|"Fetch User Data"|`.

Syntax: `-[kind]->|label|`

Example:
```
api -[reads]->|"Fetch User Data"| database
```

The `reads` kind drives validation; the label `"Fetch User Data"` enhances readability in diagrams.

### Validation Modes

CloudMer's validation engine respects three modes:
- **`normal`** (default): Structural validation + provider semantic validation, with info-level diagnostics for unknown custom kinds.
- **`strict`**: Elevates info-level diagnostics (like `AWS-RELATIONSHIP-UNKNOWN-KIND`) to errors, enforcing built-in kinds only.
- **`off`**: Disables validation entirely (not recommended for production).

Validation mode interacts with relationship types: custom kinds trigger info diagnostics in `normal` mode and errors in `strict` mode.

---

