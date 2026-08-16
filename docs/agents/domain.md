# Domain Documentation

**Layout:** Single-context

## Structure

This repository uses a single-context domain documentation layout:

- **`CONTEXT.md`** at the repo root — the domain glossary. One entry per term, alphabetized, each defining a concept in the project's domain language.
- **`docs/adr/`** — Architecture Decision Records (ADRs). One file per decision, numbered sequentially (`001-decision-title.md`).

## Consumer rules

### Reading `CONTEXT.md`

1. **Read it early** — in the first few turns of any new feature, bugfix, or architectural work.
2. **Use it as a glossary** — when you encounter an unfamiliar or overloaded term in the codebase, check `CONTEXT.md` first.
3. **Trust it** — `CONTEXT.md` is the single source of truth for domain vocabulary. If the code contradicts it, the code is wrong.

### Reading ADRs

1. **Read them when touching an area they govern** — if you're modifying authentication, read the auth ADR.
2. **Don't reopen settled decisions** — ADRs document hard-to-reverse decisions. If an ADR says "we chose X over Y," don't propose Y without a compelling reason.
3. **Link to them** — when explaining why the code works a certain way, reference the relevant ADR by number.

## Writing `CONTEXT.md`

The `/domain-modeling` skill maintains `CONTEXT.md`. It runs automatically during `/grill-with-docs` and can be invoked standalone to:

- Add a new term
- Challenge a fuzzy or overloaded term
- Resolve naming conflicts

### Format

```markdown
## Term Name

Definition in one or two sentences. Use plain language; avoid jargon unless it's already defined elsewhere in this file.

**Why this matters:** One sentence on why this concept is important to the system.

**Examples:** Concrete instances of this term in the codebase or domain.
```

## Writing ADRs

ADRs are written manually (or by the `/domain-modeling` skill when a decision is hard to reverse). Use this template:

```markdown
# ADR-NNN: Decision Title

**Status:** Accepted | Deprecated | Superseded by ADR-XXX

**Date:** YYYY-MM-DD

## Context

What problem are we solving? What constraints do we face?

## Decision

What did we decide?

## Consequences

What are the benefits and tradeoffs of this decision?
```

Number ADRs sequentially. If an ADR is later reversed, mark it **Superseded by ADR-XXX** rather than deleting it.
