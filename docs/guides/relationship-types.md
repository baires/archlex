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

## Relationship Type Reference

This section provides detailed reference documentation for each of the 9 built-in neutral relationship kinds.

### connects

**Definition:** Generic connectivity between services when the specific interaction type is ambiguous, involves multiple operations, or is not yet determined.

**When to use:**
- The relationship involves multiple operations that don't fit a single semantic type (e.g., both reads and writes).
- You're in early exploratory phases of architecture design and haven't determined the specific interaction pattern yet.
- The interaction is genuinely ambiguous or doesn't fit any of the more specific relationship kinds.
- You need a quick fallback to capture connectivity without blocking diagram creation.

**When NOT to use:**
- The interaction has a clear, single semantic meaning (use the specific type instead: `reads`, `writes`, `invokes`, etc.).
- You're documenting a production system where semantic accuracy matters for validation and understanding.
- The relationship is one-directional with a clear initiator and clear operation type.

**Directionality:** Typically bidirectional or unspecified. The arrow direction in `connects` is often a layout hint rather than a strict semantic constraint.

**Examples:**

```cloudmer
# Multi-operation edge: service both reads and writes
app -[connects]-> cache

# Ambiguous early-stage architecture
frontend -[connects]-> backend
```

**Common mistakes:**
- Overusing `connects` when more specific types like `reads`, `invokes`, or `publishes` would be semantically accurate.
- Using `connects` for clearly unidirectional operations (e.g., API calls should be `invokes`, not `connects`).
- Choosing `connects` out of laziness rather than genuine ambiguity—this reduces diagram value.

---

### reads

**Definition:** Read-only data retrieval from storage, cache, database, or other data sources. The source service retrieves data without modifying it.

**When to use:**
- The source service performs SELECT queries, GET requests, or read operations on the target.
- Data flows from the target (storage/database) to the source (compute/application).
- The interaction is read-only and does not mutate the target's state.
- You're modeling cache lookups, database queries, object storage retrievals, or configuration reads.

**When NOT to use:**
- The source service modifies, inserts, or deletes data (use `writes` instead).
- The interaction involves both reading and writing in a single conceptual operation (use `connects` or model as two separate edges).
- The source invokes a synchronous API or function that happens to return data (use `invokes` for RPC semantics).

**Directionality:** Target → Source (data flows from target to source). The arrow points from source to target, but semantically, the data moves in the opposite direction.

**Examples:**

```cloudmer
# API reads from database
api -[reads]-> database

# Service retrieves objects from storage
compute -[reads]-> storage

# Application fetches from cache
app -[reads]-> cache
```

**Common mistakes:**
- Confusing arrow direction with data flow direction. In `api -[reads]-> database`, the arrow points to the database, but data flows from database to API.
- Using `reads` for synchronous function calls that return data—use `invokes` if the interaction is RPC-style.
- Using `reads` when the service also writes (model separately or use `connects` if truly ambiguous).

---

### writes

**Definition:** Data mutation, insertion, deletion, or update to storage, cache, database, or other data sinks. The source service modifies the target's state.

**When to use:**
- The source service performs INSERT, UPDATE, DELETE, or PUT operations on the target.
- Data flows from the source (compute/application) to the target (storage/database).
- The interaction modifies the target's persistent or cached state.
- You're modeling data ingestion, log writing, database mutations, or object uploads.

**When NOT to use:**
- The source service only reads data without modifying it (use `reads` instead).
- The interaction involves both reading and writing in a single conceptual operation (use `connects` or model as two separate edges).
- The source invokes a synchronous API or function that happens to accept data (use `invokes` for RPC semantics).
- The source is publishing asynchronous messages to a queue or topic (use `publishes` instead).

**Directionality:** Source → Target (data flows from source to target).

**Examples:**

```cloudmer
# API writes to database
api -[writes]-> database

# Service uploads objects to storage
compute -[writes]-> storage

# Application updates cache
app -[writes]-> cache
```

**Common mistakes:**
- Using `writes` for asynchronous message publishing—use `publishes` for event/message emission.
- Using `writes` when the service also reads (model separately or use `connects` if truly ambiguous).
- Confusing `writes` with `invokes`—`writes` is for data mutation, `invokes` is for synchronous function calls.

---

### publishes

**Definition:** Asynchronous message or event emission to a topic, queue, event bus, or message broker. The source service sends messages without waiting for processing or acknowledgment.

**When to use:**
- The source service emits events to a message queue, topic, or event bus (e.g., SQS, SNS, Pub/Sub, EventBridge).
- The interaction is asynchronous—the source doesn't wait for a response or confirmation of processing.
- You're modeling event-driven architectures, message publishing, or fire-and-forget communication patterns.
- Multiple consumers may process the same message (fan-out pattern).

**When NOT to use:**
- The source service consumes messages from a queue or topic (use `subscribes` instead).
- The interaction is synchronous with an expected response (use `invokes` instead).
- The source writes data directly to storage or database (use `writes` instead).
- The message is a direct request-response RPC call (use `invokes` instead).

**Directionality:** Source → Target (messages flow from source to target topic/queue/bus).

**Examples:**

```cloudmer
# Service publishes events to SNS topic
api -[publishes]-> topic

# Lambda emits events to EventBridge
function -[publishes]-> eventbus

# Application sends messages to SQS queue
app -[publishes]-> queue
```

**Common mistakes:**
- Using `publishes` for synchronous API calls—use `invokes` for request-response patterns.
- Confusing `publishes` with `subscribes`—`publishes` is message emission, `subscribes` is message consumption.
- Using `publishes` for direct database writes—use `writes` for data persistence.

---

### subscribes

**Definition:** Receiving or consuming messages from a queue, topic, or stream. The source service listens to and processes messages from the target.

**When to use:**
- The source service consumes messages from a queue, topic, or event stream (e.g., SQS, SNS, Pub/Sub, Kinesis).
- The source service polls, pulls, or receives push notifications of messages from the target.
- You're modeling event consumers, message processors, or subscriber patterns in event-driven architectures.
- The source processes messages asynchronously from the target.

**When NOT to use:**
- The source service emits messages to a queue or topic (use `publishes` instead).
- The interaction is synchronous with an expected response (use `invokes` instead).
- The source reads data directly from storage or database (use `reads` instead).
- The message is a direct request-response RPC call (use `invokes` instead).

**Directionality:** Source subscribes to Target. The arrow points from source (subscriber) to target (queue/topic), indicating the source's dependency on the target for messages.

**Examples:**

```cloudmer
# Lambda subscribes to SQS queue
function -[subscribes]-> queue

# Service consumes from SNS topic subscription
processor -[subscribes]-> topic

# Worker pulls from event stream
worker -[subscribes]-> stream
```

**Common mistakes:**
- Using `subscribes` for message emission—use `publishes` for sending messages.
- Confusing arrow direction—the arrow points from subscriber to queue/topic, not the direction messages flow.
- Using `subscribes` for synchronous API calls—use `invokes` for request-response patterns.

---

### invokes

**Definition:** Synchronous function call, API request, or RPC invocation where the source waits for execution and typically expects a response.

**When to use:**
- The source service makes a synchronous HTTP/REST/GraphQL API call to the target.
- The source invokes a function (Lambda, Cloud Function) and waits for completion.
- The source makes an RPC or gRPC call expecting a response.
- The interaction is request-response with the source blocking or awaiting the result.

**When NOT to use:**
- The interaction is asynchronous with no expected response (use `publishes` or `subscribes`).
- The source only reads data from storage without invoking a compute service (use `reads`).
- The source only writes data to storage without invoking a compute service (use `writes`).
- The target is a passive data store rather than an active compute service.

**Directionality:** Source → Target (the source initiates the call, the target executes and responds).

**Examples:**

```cloudmer
# API invokes Lambda function
api -[invokes]-> function

# Service makes REST API call
frontend -[invokes]-> backend

# Orchestrator invokes multiple services
orchestrator -[invokes]-> service-a
orchestrator -[invokes]-> service-b
```

**Common mistakes:**
- Using `invokes` for asynchronous event emission—use `publishes` for fire-and-forget patterns.
- Using `invokes` for passive data retrieval from storage—use `reads` for database/storage queries.
- Using `invokes` for data writes to storage—use `writes` for persistence operations.

---

