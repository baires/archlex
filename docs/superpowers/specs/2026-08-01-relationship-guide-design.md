# Relationship Type Usage Guide Design

## Overview

This design specifies a comprehensive user-facing documentation guide for CloudMer relationship types. The guide helps users understand the semantics of the 9 built-in neutral relationship kinds, choose the right type for their architecture diagrams, and use custom relationship types appropriately.

## Problem Statement

Users currently face several challenges when working with relationships in CloudMer:

1. **Semantic confusion** — Users don't understand what each relationship type means (e.g., the difference between `publishes` and `subscribes`)
2. **Wrong type selection** — Users pick inappropriate relationship types for common scenarios (e.g., using `connects` when `invokes` is more accurate)
3. **Invalid combinations** — Users don't know which relationship types are valid for specific service pairs
4. **Custom type uncertainty** — Users are unsure when custom relationship types are appropriate vs when to use built-in types

Without clear guidance, users produce diagrams with inconsistent or semantically incorrect relationships, reducing diagram clarity and limiting the value of CloudMer's semantic validation.

## Goals

1. Provide clear, comprehensive documentation for all 9 built-in relationship types
2. Help users select the correct relationship type through a question-based decision framework
3. Define guidelines for when and how to use custom relationship types
4. Explain validation behavior and troubleshooting steps
5. Establish visual conventions for relationship rendering

## Non-Goals

1. Interactive tooling (relationship browser, validator, suggestion engine) — addressed in future phases
2. Provider-specific service pair rules (e.g., "Lambda → DynamoDB should use `writes`") — too prescriptive and belongs in provider-specific docs
3. Editor integration (Monaco code actions, hover tooltips) — separate implementation effort
4. Changes to validation rules or core relationship semantics — documentation only
5. Relationship cardinality constraints (1:1, 1:N, N:M) — not currently modeled in the language

## Audience

Primary: CloudMer users writing architecture diagrams who need to choose relationship types

Secondary: New users learning CloudMer syntax and semantics

## Design

### Document Structure

**File location:** `docs/guides/relationship-types.md`

**Sections:**

1. **Introduction**
   - What relationships are in CloudMer
   - Why choosing the right type matters for semantic accuracy
   - Overview of the 9 built-in neutral kinds
   - Brief mention of custom relationship support

2. **Core Concepts**
   - Relationship directionality (source, target, arrow semantics)
   - Neutral kinds vs custom kinds
   - Relationship kind (`-[kind]->`) vs presentation label (`->|label|`)
   - How relationships interact with validation modes

3. **Relationship Type Reference**
   - One subsection per built-in type (9 total)
   - Consistent structure for each type (see format below)
   - Types covered: `connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, `assumes-role`

4. **Question-Based Selection Guide**
   - Decision framework for choosing relationship types
   - Series of questions that narrow down to appropriate type
   - Links back to detailed reference sections

5. **Custom Relationships**
   - When custom relationship types are appropriate
   - Naming conventions and best practices
   - Trade-offs (flexibility vs validation coverage)
   - Examples of good and bad custom kinds

6. **Common Patterns**
   - Architectural patterns organized by category
   - Provider-agnostic examples
   - Categories: data flow, event-driven, control flow, identity/access, replication, general connectivity

7. **Validation & Troubleshooting**
   - How relationship validation works
   - Understanding diagnostic messages
   - Common validation errors and fixes
   - When to ignore informational diagnostics

8. **Visual Conventions**
   - Arrow styles (`->`, `<-`, `<->`, `--`, `-.->`)
   - Relationship rendering behavior
   - How direction affects layout vs semantics

### Relationship Type Reference Format

Each of the 9 relationship types follows this structure:

**Heading:** `### {relationship-type}`

**Definition:** Clear 1-2 sentence explanation of semantic meaning

**When to use:** 
- 3-4 bullet points describing appropriate scenarios
- Focus on user intent and architectural patterns

**When NOT to use:**
- 2-3 anti-patterns or common mistakes
- Clarify boundaries with similar relationship types

**Directionality:**
- Explain whether arrow direction has semantic meaning
- Describe data flow direction if applicable (e.g., `reads` has data flowing target→source)

**Examples:**
- 3-4 code snippets showing correct usage
- Use generic service names when possible (compute, database, storage, queue)
- Show variety of contexts (different arrow styles, with/without labels)

**Common mistakes:**
- Pitfalls users encounter with this specific type
- Confusion with other relationship types

### Question-Based Selection Guide Structure

**Format:** Structured questionnaire that narrows down to the right relationship type

**Question Flow:**

1. **Primary purpose question:**
   - Data access → leads to questions 2-3
   - Communication/messaging → leads to questions 4-6
   - Access control → leads to `assumes-role`
   - Traffic routing → leads to `routes`
   - Data replication → leads to `replicates`
   - General/unclear → leads to `connects`

2. **Data access refinement:**
   - Does source modify data? 
     - Yes → `writes`
     - No → `reads`

3. **Communication refinement:**
   - Synchronous (wait for response)? → `invokes`
   - Asynchronous (fire and forget)? → continue to question 4

4. **Async messaging direction:**
   - Source sends messages → `publishes`
   - Source receives messages → `subscribes`

**Presentation:**
- Each question presented clearly with options
- Final answers link to the detailed reference section for that type
- Include "Not sure?" escape hatch pointing to `connects` as safe default

### Custom Relationships Guidelines

**When appropriate:**
- Domain-specific semantics not covered by neutral kinds (e.g., `authenticates`, `monitors`)
- More precise intent than generic types (e.g., `replicates-async` vs `replicates`)
- Specialized workflows specific to your architecture

**Best practices:**
- Use lowercase kebab-case (e.g., `-[authenticates]->`)
- Choose descriptive verb-based names
- Be consistent across diagrams
- Document custom kinds in your architecture docs

**Trade-offs:**
- Custom kinds are preserved but emit `AWS-RELATIONSHIP-UNKNOWN-KIND` (info level)
- Receive structural validation only (no provider-specific semantic rules)
- May limit diagram portability across teams

**When to use built-in types:**
- Semantic fits reasonably well
- Want full semantic validation
- Relationship is common across architectures

**Examples:**
- Good: `authenticates`, `monitors`, `scales`, `backups`, `transforms`, `encrypts`
- Unnecessary: `gets` (use `reads`), `sends` (use `publishes`), `links` (use `connects`)

### Common Patterns Content

Organize by architectural pattern category, with 2-3 examples each:

**Data Flow Patterns:**
- Database access: `reads`, `writes`
- Cache operations: `reads`, `writes`
- Storage operations: `reads`, `writes`
- Unidirectional data pipelines

**Event-Driven Patterns:**
- Message queues: `publishes`, `subscribes`
- Event buses: `publishes`, `subscribes`
- Synchronous invocation: `invokes`
- Webhook callbacks: `invokes`

**Control Flow Patterns:**
- Orchestration: `invokes`
- Traffic distribution: `routes`
- Load balancing: `routes`
- API proxying: `routes`

**Identity & Access Patterns:**
- Permission delegation: `assumes-role`
- Cross-resource access: `assumes-role`

**Replication Patterns:**
- Database replication: `replicates`
- Data synchronization: `replicates`
- Backup workflows: `replicates`

**General Connectivity:**
- When semantics are ambiguous: `connects`
- Multiple operations on one edge: `connects`
- Exploratory diagrams: `connects`

Each pattern includes:
- Brief description
- Which relationship type(s) apply
- 2-3 generic code examples

### Validation & Troubleshooting Content

**How validation works:**
- Three validation passes: structural, provider semantic, provider guidance
- Validation modes: `normal`, `strict`, `off`
- Custom relationships receive structural validation only

**Understanding diagnostics:**
- `AWS-RELATIONSHIP-UNKNOWN-KIND` meaning and severity (info)
- When semantic validation is skipped
- Difference between structural and semantic errors

**Common validation errors:**
- Using invalid relationship between incompatible services
- Missing required relationships for certain patterns
- Conflicting relationship directions

**Troubleshooting steps:**
1. Check if both services are in the catalog (unknown resources limit validation)
2. Verify relationship direction matches semantic intent
3. Consider if a different relationship type is more appropriate
4. Use custom relationship kind if built-in types don't fit

**When to ignore warnings:**
- Informational diagnostics for custom kinds (expected behavior)
- Guidance-level warnings in exploratory diagrams

### Visual Conventions Content

**Arrow styles:**
- `->` or `>`: Forward directed relationship
- `<-`: Reverse directed relationship
- `<->`: Bidirectional relationship
- `--`: Undirected relationship
- `-.->`: Dotted/dashed relationship (often used for optional/conditional)

**Relationship kind vs label:**
- Kind: Machine-readable identifier `-[kind]->`
- Label: Human-readable presentation `->|label|`
- Can combine: `-[kind]->|label|`

**Semantic vs presentation:**
- Arrow direction affects semantics (who initiates, data flow)
- Document `direction` directive affects layout only, not semantics
- Example: `reads` always means data flows target→source regardless of arrow direction in diagram

## Implementation Approach

### Phase 1: Write Core Documentation (This Spec)

1. Create `docs/guides/relationship-types.md`
2. Write introduction and core concepts sections
3. Document all 9 built-in relationship types with consistent format
4. Create question-based selection guide
5. Write custom relationships guidance
6. Document common patterns
7. Add validation & troubleshooting section
8. Document visual conventions

### Phase 2: Review & Refinement

1. Internal review for technical accuracy
2. User testing with sample scenarios
3. Refine based on feedback
4. Add cross-references and navigation aids

### Phase 3: Integration

1. Link from main documentation index
2. Add to CLI help output (pointer to guide)
3. Reference from error messages where relevant
4. Update README and getting started docs

## Success Criteria

1. Users can quickly find the right relationship type for their scenario
2. Clear examples for every built-in relationship type
3. Unambiguous guidance on when to use custom relationships
4. Reduced semantic errors in user diagrams
5. Consistent relationship usage patterns across CloudMer community

## Future Enhancements (Out of Scope)

These are explicitly deferred to future work:

1. **Interactive Relationship Explorer** — web-based tool to browse relationship types
2. **Service Pair Lookup Tool** — query common service combinations (requires provider-specific rules)
3. **Relationship Validator Tool** — standalone CLI command to validate relationships
4. **Editor Integration** — Monaco code actions, hover tooltips with relationship info
5. **Suggestion Engine** — AI/ML-based relationship type recommendations
6. **Visual Decision Tree** — interactive flowchart for relationship selection
7. **Relationship Templates** — reusable relationship patterns for common architectures

## Open Questions

None at this time. All key decisions have been made through the brainstorming process.

## References

- [Language Specification](../specs/language.md) — relationship syntax
- [AWS Semantics](../specs/aws-semantics.md) — neutral relationship kinds, validation
- [GCP Semantics](../specs/gcp-semantics.md) — relationship validation for GCP
- [Error System](../errors/README.md) — diagnostic codes including relationship errors
