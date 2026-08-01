# ArchLex MVP TODO

Complete an item only with implementation, tests, and relevant docs. Parenthetical dependencies must be complete first.

## Phase 0 — Architecture and toolchain baseline

- [x] Scaffold pnpm, Turborepo, strict TypeScript references, and root scripts.
- [x] Configure Vite ESM builds, Biome, Vitest projects, Changesets, and CI.
- [x] Create all library package shells and the playground; enforce dependency boundaries.
- [x] Spike Chevrotain recovery/source spans and private CST conversion.
- [x] Spike ELK worker/inline parity, protocol, and cancellation.
- [x] Spike DOM-free serialization and browser `mountSvg`.
- [x] Verify Node 22/Chromium imports and record bundle/worker baselines.

## Phase 1 — Minimal vertical slice

- [x] Define span, diagnostic, AST, graph, layout, mapping, and result types. (Phase 0)
- [x] Parse implicit resources and `>`/`->` chains.
- [x] Add RDS Proxy, RDS, and ECS catalog entries and sanitized icons.
- [x] Resolve implicit identities into a structural graph.
- [x] Implement ELK LR layout and deterministic accessible SVG.
- [x] Implement `createArchLex` and source-to-SVG orchestration.
- [x] Build the minimal playground through public exports.
- [x] Add Node/Chromium canonical-example integration tests.

## Phase 2 — Language, recovery, and graph

- [x] Implement directives and option precedence.
- [x] Implement named/qualified resources and lexical scope.
- [x] Implement every relationship form, kind, label, and chain.
- [x] Implement account/region/VPC/subnet scopes and stable IDs.
- [x] Implement invalid nodes, missing endpoints/braces, and exact diagnostics.
- [x] Implement unknown resource/relationship fallbacks.
- [x] Execute documented examples as fixtures and add fast-check properties.

## Phase 3 — AWS catalog and semantics

- [x] Define provider, resource, relationship, rule, and icon schemas.
- [x] Build checksummed AWS ingestion, SVG sanitization, and deterministic generation.
- [x] Populate the initial catalog from the AWS semantics spec.
- [x] Implement neutral/custom relationships and three validation passes.
- [x] Implement normal, strict, and off policy.
- [x] Create diagnostic registry and RDS Proxy network compatibility rule.
- [x] Add meaningful initial rules for every service category.
- [x] Test schemas, aliases, icons, codes, checksums, and all rule outcomes.

## Phase 4 — Production layout and SVG

- [x] Implement compound groups, measured nodes, ports, routing, and four directions.
- [x] Version worker protocol; implement abort, stale-result handling, and inline parity.
- [x] Implement canonical geometry fingerprints and cache.
- [x] Implement stable SVG IDs/order, numbers, arrows, labels, groups, and icons.
- [x] Implement themes and error/warning/unknown/focus treatments.
- [x] Implement accessible names/navigation and safe mounting.
- [x] Add geometry, parity, snapshot, safety, axe-core, and keyboard tests.

## Phase 5 — Reference playground

- [x] Build responsive editor/preview/diagnostics UI.
- [x] Configure Monaco syntax, completion, and markers.
- [x] Implement 150 ms debounce, cancellation, and prior-preview preservation.
- [x] Synchronize source, SVG, and diagnostics selection.
- [x] Add override controls, examples, versioned persistence, and corruption fallback.
- [x] Add clean SVG copy/download.
- [x] Add Playwright responsive, accessibility, persistence, sync, and export tests.

## Phase 6 — Hardening and release

- [ ] Write getting-started, API, package, example, and compatibility docs.
- [ ] Check links, public exports, diagnostic codes, and executable examples.
- [ ] Add packed clean-consumer tests for Node 22 and Vite.
- [ ] Define/enforce bundle, latency, and worker-start budgets.
- [ ] Complete SVG security and AWS/GCP license/attribution audits.
- [ ] Complete all CI gates and confirm npm scope ownership.
- [ ] Configure prerelease, provenance, changelogs, and release dry-run.
- [ ] Deploy playground and publish verified `0.1.0`.

## Phase 6 - Fixes
- [ ] ELK currently produces a large browser bundle (~552 KB gzip). It works correctly, but code splitting/worker packaging should be addressed during the production-layout phase.

## After MVP — GCP provider

- [x] Scaffold `packages/gcp` mirroring the AWS package layout and boundary rules.
- [x] Ingest official Google Cloud icons (2025 unique + legacy fallback) with CSS inlining, sanitization, and checksummed deterministic generation.
- [x] Populate the initial GCP catalog (24 services) with aliases and containment metadata.
- [x] Implement `gcpProvider` with catalog resolution, icons, and validation passes.
- [x] Add GCP diagnostic registry and initial rules (subnet containment, Cloud SQL VPC placement).
- [x] Wire GCP through core re-export, playground providers, and GCP examples.
- [x] Test catalog, importer, aliases, codes, checksums, rule outcomes, and multi-provider dispatch.
- [x] Document GCP semantics and update architecture/contribution guides.
