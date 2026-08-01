# Relationship Type Usage Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive user-facing Relationship Type Usage Guide in `docs/guides/relationship-types.md` detailing the 9 built-in neutral relationship types, custom relationships, selection framework, common patterns, validation/troubleshooting, and visual conventions, and update `docs/README.md` to link to it.

**Architecture:** A structured documentation guide written in Markdown following the approved design spec (`docs/superpowers/specs/2026-08-01-relationship-guide-design.md`). The guide is divided into distinct logical sections covering introduction, core concepts, type reference, selection framework, custom types, architectural patterns, validation, and visual rendering conventions.

**Tech Stack:** Markdown (GitHub Flavored Markdown)

---

### Task 1: Initialize Guide Structure, Introduction, and Core Concepts

**Files:**
- Create: `docs/guides/relationship-types.md`

**Step 1: Write header, Introduction, and Core Concepts sections**

Create `docs/guides/relationship-types.md` with:
- Document Title: `# Relationship Type Usage Guide`
- **Section 1: Introduction**:
  - Explanation of relationships in ArchLex and why semantic accuracy matters.
  - Overview table of the 9 built-in neutral relationship kinds (`connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, `assumes-role`).
  - Brief introduction to custom relationship kinds.
- **Section 2: Core Concepts**:
  - Relationship directionality: source vs target service, arrow semantics.
  - Built-in neutral kinds vs custom kinds.
  - Difference between relationship kind (`-[kind]->`) and presentation label (`->|label|`).
  - Interaction between relationship types and validation modes (`normal`, `strict`, `off`).

**Step 2: Verify file creation**

Run: `test -f docs/guides/relationship-types.md && echo "EXISTS"`
Expected: `EXISTS`

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add introduction and core concepts to relationship types guide"
```

---

### Task 2: Write Relationship Type Reference for Data Access Kinds (`connects`, `reads`, `writes`)

**Files:**
- Modify: `docs/guides/relationship-types.md`

**Step 1: Append Data Access Kind Reference Sections**

Add detailed reference subsections for `connects`, `reads`, and `writes` in `docs/guides/relationship-types.md`. Each subsection must strictly adhere to the standard reference format:
- **Heading**: `### {type}`
- **Definition**: 1-2 sentence semantic meaning.
- **When to use**: 3-4 scenario bullet points.
- **When NOT to use**: 2-3 anti-patterns / boundaries.
- **Directionality**: Direction semantics and data flow (e.g. `reads` data flows target->source).
- **Examples**: Code snippets with generic service names (compute, database, storage).
- **Common mistakes**: Pitfalls and confusion with other kinds.

Specific details per type:
- `connects`: Generic connectivity fallback, ambiguous edges, multi-operation edges.
- `reads`: Read-only access, data retrieval from storage/cache/database.
- `writes`: Data mutation, insertion, deletion, updating storage/cache/database.

**Step 2: Verify content presence**

Run: `grep -E "^### (connects|reads|writes)" docs/guides/relationship-types.md`
Expected: 3 matching headers (`### connects`, `### reads`, `### writes`).

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add connects, reads, and writes reference sections"
```

---

### Task 3: Write Relationship Type Reference for Messaging & Execution Kinds (`publishes`, `subscribes`, `invokes`)

**Files:**
- Modify: `docs/guides/relationship-types.md`

**Step 1: Append Messaging & Execution Kind Reference Sections**

Add detailed reference subsections for `publishes`, `subscribes`, and `invokes` in `docs/guides/relationship-types.md` using the standard reference format.

Specific details per type:
- `publishes`: Asynchronous message/event emission to topic, queue, or event bus (source -> target).
- `subscribes`: Receiving/consuming messages from queue or topic (source subscribes to target).
- `invokes`: Synchronous function call, API request, or RPC invocation waiting for execution/response.

**Step 2: Verify content presence**

Run: `grep -E "^### (publishes|subscribes|invokes)" docs/guides/relationship-types.md`
Expected: 3 matching headers (`### publishes`, `### subscribes`, `### invokes`).

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add publishes, subscribes, and invokes reference sections"
```

---

### Task 4: Write Relationship Type Reference for Routing, Replication, & Access Control Kinds (`routes`, `replicates`, `assumes-role`)

**Files:**
- Modify: `docs/guides/relationship-types.md`

**Step 1: Append Routing, Replication, & Access Control Kind Reference Sections**

Add detailed reference subsections for `routes`, `replicates`, and `assumes-role` in `docs/guides/relationship-types.md` using the standard reference format.

Specific details per type:
- `routes`: Traffic distribution, load balancing, proxying, API gateway routing.
- `replicates`: Data synchronization, cross-region replication, backup workflows.
- `assumes-role`: Identity delegation, IAM role assumption, permission granting across services.

**Step 2: Verify all 9 reference sections exist**

Run: `grep -E "^### (connects|reads|writes|publishes|subscribes|invokes|routes|replicates|assumes-role)" docs/guides/relationship-types.md | wc -l`
Expected: `9`

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add routes, replicates, and assumes-role reference sections"
```

---

### Task 5: Write Question-Based Selection Guide and Custom Relationships Guidelines

**Files:**
- Modify: `docs/guides/relationship-types.md`

**Step 1: Append Selection Guide and Custom Relationships Sections**

Add **Section 4: Question-Based Selection Guide** and **Section 5: Custom Relationships**:
- **Section 4: Question-Based Selection Guide**:
  - Decision tree flow starting with primary intent (Data access, Communication, Access control, Traffic routing, Data replication, General).
  - Sub-questions for Data access (source modifies data? -> writes vs reads) and Communication (sync -> invokes vs async -> publishes/subscribes).
  - Deep-links back to each type's reference heading.
  - "Not sure?" fallback recommending `connects`.
- **Section 5: Custom Relationships**:
  - When appropriate (domain-specific semantics, precise intent).
  - Naming conventions (lowercase kebab-case, e.g. `-[authenticates]->`).
  - Trade-offs (info-level diagnostic `AWS-RELATIONSHIP-UNKNOWN-KIND`, structural validation only).
  - Good custom examples (`authenticates`, `monitors`, `transforms`, `encrypts`) vs Unnecessary custom examples (`gets` -> `reads`, `sends` -> `publishes`).

**Step 2: Verify sections added**

Run: `grep -E "^## (Question-Based Selection Guide|Custom Relationships)" docs/guides/relationship-types.md`
Expected: 2 matching section headers.

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add selection guide and custom relationships sections"
```

---

### Task 6: Write Common Architectural Patterns Section

**Files:**
- Modify: `docs/guides/relationship-types.md`

**Step 1: Append Common Architectural Patterns Section**

Add **Section 6: Common Architectural Patterns**, organized by category with provider-agnostic examples:
- **Data Flow Patterns**: Database access (`reads`, `writes`), cache operations, storage operations, unidirectional pipelines.
- **Event-Driven Patterns**: Message queues (`publishes`, `subscribes`), event buses, synchronous RPC (`invokes`), webhooks.
- **Control Flow Patterns**: Orchestration (`invokes`), load balancing (`routes`), API gateway proxying (`routes`).
- **Identity & Access Patterns**: Permission delegation (`assumes-role`), cross-account/resource access.
- **Replication Patterns**: Database replication (`replicates`), cross-region sync (`replicates`).
- **General Connectivity**: Multi-operation edges, ambiguous edges, exploratory diagrams (`connects`).

Each pattern includes:
- Category & pattern description
- Recommended relationship type(s)
- 2-3 code snippets in ArchLex syntax

**Step 2: Verify section added**

Run: `grep -E "^## Common Architectural Patterns" docs/guides/relationship-types.md`
Expected: 1 matching header.

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add common architectural patterns section"
```

---

### Task 7: Write Validation & Troubleshooting and Visual Conventions Sections

**Files:**
- Modify: `docs/guides/relationship-types.md`

**Step 1: Append Validation & Troubleshooting and Visual Conventions Sections**

Add **Section 7: Validation & Troubleshooting** and **Section 8: Visual Conventions**:
- **Section 7: Validation & Troubleshooting**:
  - Validation engine overview (structural, provider semantic, provider guidance).
  - Validation modes (`normal`, `strict`, `off`).
  - Diagnostic code breakdown (`AWS-RELATIONSHIP-UNKNOWN-KIND`, error vs info).
  - Common errors and fixes (incompatible services, direction mismatch).
  - Step-by-step troubleshooting checklist.
- **Section 8: Visual Conventions**:
  - Arrow styles (`->`, `<-`, `<->`, `--`, `-.->`).
  - Relationship kind vs presentation label (`-[kind]->|label|`).
  - Semantic direction (data flow/initiator) vs visual layout (`direction` directive affects layout only).

**Step 2: Verify all 8 main sections exist in guide**

Run: `grep -E "^## " docs/guides/relationship-types.md`
Expected: 8 section titles matching the design spec.

**Step 3: Commit**

```bash
git add docs/guides/relationship-types.md
git commit -m "docs: add validation/troubleshooting and visual conventions sections"
```

---

### Task 8: Update Documentation Index (`docs/README.md`)

**Files:**
- Modify: `docs/README.md`

**Step 1: Add Relationship Type Usage Guide link to `docs/README.md`**

Update `docs/README.md` under `## Reading order` to list the new guide:
- Link `[Relationship type usage guide](guides/relationship-types.md)` under reading order.

**Step 2: Verify link in `docs/README.md`**

Run: `grep "guides/relationship-types.md" docs/README.md`
Expected: line containing `[Relationship type usage guide](guides/relationship-types.md)`

**Step 3: Commit**

```bash
git add docs/README.md
git commit -m "docs: link relationship type usage guide in docs/README.md"
```
