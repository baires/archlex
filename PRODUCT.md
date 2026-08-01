# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are developers embedding `@archlex/core` into their own browser apps, documentation, or tooling — the product is a framework-neutral browser library, and the playground is its reference consumer for evaluation and debugging, not a standalone end-user product (per the approved foundation design). Secondary audience: the same developers authoring and troubleshooting diagrams interactively in the playground before integrating.

## Product Purpose

ArchLex turns a concise, provider-aware text language into accessible SVG cloud architecture diagrams. Semantic validation is the main product capability: the tool understands cloud resources, containment, and relationships rather than drawing generic graphs. Errors never block output — the pipeline returns recoverable diagnostics plus a useful partial diagram. Success for the first milestone is defined by the acceptance criteria in `docs/superpowers/specs/2026-07-27-archlex-foundation-design.md` (deterministic shorthand rendering, named resources with nested boundaries, full edge vocabulary, stable diagnostics with source/SVG correlation, core AWS catalog with semantic rules, worker-based layout, framework-neutral consumption, CI test coverage).

## Positioning

ArchLex's differentiator is semantic knowledge of cloud resources and relationships, not generic graph drawing. Mermaid is prior art for separating parsing from rendering, but ArchLex owns its language, semantic graph, diagnostics, layout adaptation, and SVG output — a neighboring diagram tool cannot truthfully claim provider-aware validation (containment rules, relationship compatibility, architecture guidance) with stable diagnostic codes mapped back to source spans.

## Operating Context

Diagrams are authored as text: shorthand like `rds-proxy > rds > ecs`, named instances, node display labels (`primary: rds["Primary DB"]`), typed relationships (`-[writes]->`), presentation labels, and semantic containment blocks (`account`, `region`, `vpc`, `subnet`). Directives declare provider, layout direction (`LR`/`RL`/`TB`/`BT`), and validation mode (`strict`/`normal`/`off`). The library renders asynchronously in the browser (layout in a Web Worker) and also runs in Node.js 22 without browser globals. The playground is where the product is evaluated: Monaco editor with syntax highlighting and completion, debounced live preview, two-way source↔SVG selection sync, diagnostics panel, direction/validation/theme controls, copy/download SVG export, and browser-local persistence.

## Capabilities and Constraints

Confirmed capabilities:

- AWS and GCP providers behind provider-neutral interfaces; fully qualified names (`aws.rds`) prepare multi-cloud diagrams.
- Three-pass validation (structural, provider, architecture guidance) with stable diagnostic codes, severities (`error`/`warning`/`info`), source spans, and related element IDs.
- Partial diagrams on error; invalid edges/nodes get distinct visual treatments; unknown semantics render normally with info diagnostics.
- ELK layered layout with compound nodes, ports, orthogonal routing; layout direction independent of relationship direction; result caching by geometry fingerprint.
- Deterministic SVG string output with stable IDs and `data-*` correlation attributes; light and dark themes.

Confirmed constraints:

- No user accounts, backend persistence, collaboration, cloud storage, or sharing links.
- No PNG generation in the core renderer; SVG is the only core output (the playground may rasterize later via canvas).
- The core library stays framework-neutral; React exists only in the playground, which consumes only public `@archlex/core` behavior.
- Strict TypeScript, ESM-only monorepo (pnpm workspaces + Turborepo); packages remain private and the `@archlex/*` npm scope is provisional until the release phase.

Open decisions (not yet confirmed):

- Primary-user weighting: library integrators vs. direct diagram authors in the playground — docs favor library-first; not explicitly re-confirmed.
- Formal accessibility conformance target (see below).

## Brand Commitments

- Name: **ArchLex**.
- Official AWS and GCP architecture icon assets are separately versioned catalogs and must preserve their official visual treatment; themes must not recolor provider assets against their usage guidance.
- No logo, visual identity, or marketing voice has been established yet.

## Evidence on Hand

- Approved product intent: `docs/superpowers/specs/2026-07-27-archlex-foundation-design.md`.
- Behavior and contract specs: `docs/specs/` (language, public API, AWS/GCP semantics, layout/rendering, playground).
- Bundled playground examples: shorthand, nested-valid, and invalid RDS Proxy (`apps/playground/src/examples.ts`).
- Test suites: Vitest unit/property tests plus Playwright browser tests.

Absent and must not be fabricated: customer names, testimonials, usage benchmarks, pricing, and any hosted-service claims.

## Product Principles

1. **Semantics are the product.** ArchLex wins by understanding cloud architecture, not by drawing prettier boxes.
2. **Never punish the author.** Invalid input produces diagnostics and a partial diagram — never a blank canvas or a thrown error for expected mistakes.
3. **Determinism builds trust.** Same source, same SVG: stable ordering, IDs, spans, and diagnostic codes.
4. **The library is the product.** The core stays framework-neutral; every UI is a consumer of the public API, including the playground.
5. **Accessibility is intrinsic.** The SVG output itself is accessible — title, description, textual labels, keyboard navigation, focus states — not wrapped in accessibility after the fact.

## Accessibility & Inclusion

Established product requirements: accessible SVG output (title/description, textual node labels, navigable interactive elements, visible focus states); keyboard-operable playground controls and resize; diagnostic count announcements without replaying every diagnostic per keystroke; focus survives SVG replacement. No formal conformance target (e.g. WCAG level) has been pinned — open decision.
