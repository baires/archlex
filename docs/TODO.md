# CloudMer MVP TODO

Complete an item only with implementation, tests, and relevant docs. Parenthetical dependencies must be complete first.

## Phase 0 — Architecture and toolchain baseline

- [ ] Scaffold pnpm, Turborepo, strict TypeScript references, and root scripts.
- [ ] Configure Vite ESM builds, Biome, Vitest projects, Changesets, and CI.
- [ ] Create all library package shells and the playground; enforce dependency boundaries.
- [ ] Spike Chevrotain recovery/source spans and private CST conversion.
- [ ] Spike ELK worker/inline parity, protocol, and cancellation.
- [ ] Spike DOM-free serialization and browser `mountSvg`.
- [ ] Verify Node 22/Chromium imports and record bundle/worker baselines.

## Phase 1 — Minimal vertical slice

- [ ] Define span, diagnostic, AST, graph, layout, mapping, and result types. (Phase 0)
- [ ] Parse implicit resources and `>`/`->` chains.
- [ ] Add RDS Proxy, RDS, and ECS catalog entries and sanitized icons.
- [ ] Resolve implicit identities into a structural graph.
- [ ] Implement ELK LR layout and deterministic accessible SVG.
- [ ] Implement `createCloudMer` and source-to-SVG orchestration.
- [ ] Build the minimal playground through public exports.
- [ ] Add Node/Chromium canonical-example integration tests.

## Phase 2 — Language, recovery, and graph

- [ ] Implement directives and option precedence.
- [ ] Implement named/qualified resources and lexical scope.
- [ ] Implement every relationship form, kind, label, and chain.
- [ ] Implement account/region/VPC/subnet scopes and stable IDs.
- [ ] Implement invalid nodes, missing endpoints/braces, and exact diagnostics.
- [ ] Implement unknown resource/relationship fallbacks.
- [ ] Execute documented examples as fixtures and add fast-check properties.

## Phase 3 — AWS catalog and semantics

- [ ] Define provider, resource, relationship, rule, and icon schemas.
- [ ] Build checksummed AWS ingestion, SVG sanitization, and deterministic generation.
- [ ] Populate the initial catalog from the AWS semantics spec.
- [ ] Implement neutral/custom relationships and three validation passes.
- [ ] Implement normal, strict, and off policy.
- [ ] Create diagnostic registry and RDS Proxy network compatibility rule.
- [ ] Add meaningful initial rules for every service category.
- [ ] Test schemas, aliases, icons, codes, checksums, and all rule outcomes.

## Phase 4 — Production layout and SVG

- [ ] Implement compound groups, measured nodes, ports, routing, and four directions.
- [ ] Version worker protocol; implement abort, stale-result handling, and inline parity.
- [ ] Implement canonical geometry fingerprints and cache.
- [ ] Implement stable SVG IDs/order, numbers, arrows, labels, groups, and icons.
- [ ] Implement themes and error/warning/unknown/focus treatments.
- [ ] Implement accessible names/navigation and safe mounting.
- [ ] Add geometry, parity, snapshot, safety, axe-core, and keyboard tests.

## Phase 5 — Reference playground

- [ ] Build responsive editor/preview/diagnostics UI.
- [ ] Configure Monaco syntax, completion, and markers.
- [ ] Implement 150 ms debounce, cancellation, and prior-preview preservation.
- [ ] Synchronize source, SVG, and diagnostics selection.
- [ ] Add override controls, examples, versioned persistence, and corruption fallback.
- [ ] Add clean SVG copy/download.
- [ ] Add Playwright responsive, accessibility, persistence, sync, and export tests.

## Phase 6 — Hardening and release

- [ ] Write getting-started, API, package, example, and compatibility docs.
- [ ] Check links, public exports, diagnostic codes, and executable examples.
- [ ] Add packed clean-consumer tests for Node 22 and Vite.
- [ ] Define/enforce bundle, latency, and worker-start budgets.
- [ ] Complete SVG security and AWS license/attribution audits.
- [ ] Complete all CI gates and confirm npm scope ownership.
- [ ] Configure prerelease, provenance, changelogs, and release dry-run.
- [ ] Deploy playground and publish verified `0.1.0`.
