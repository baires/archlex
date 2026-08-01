# ArchLex MVP Roadmap

Each phase starts after the preceding gate. A deliverable includes implementation, tests, and relevant documentation.

## Phase 0 — Architecture and toolchain baseline

**Goal:** Prove stack and boundaries before features.

**Deliverables:** Linked specs; pnpm/Turborepo, strict TypeScript, Vite, Biome, Vitest, Changesets, CI; package shells/boundary rules; Chevrotain, ELK worker, Node import, DOM-free SVG, and browser-mount spikes; bundle/worker baselines.

**Exit:** Root checks pass, Node 22 and Chromium import built packages, worker round-trip succeeds, and docs have no unresolved decisions.

## Phase 1 — Minimal vertical slice

**Goal:** Render `rds-proxy > rds > ecs` through production-shaped stages.

**Deliverables:** Model types; minimal grammar; three AWS entries/icons; structural graph; ELK LR layout; deterministic SVG; orchestration; minimal playground.

**Exit:** The example renders byte-identically through public APIs in Node and Chromium.

## Phase 2 — Language, recovery, and semantic graph

**Goal:** Complete MVP syntax with useful partial results.

**Deliverables:** All arrows, kinds, labels, comments, directives, named/qualified resources, scopes, stable identity, private CST conversion, recovery/source maps, and unknown fallbacks.

**Exit:** All documented syntax has valid/invalid/recovery/span fixtures; arbitrary input cannot crash or hang.

## Phase 3 — AWS catalog and semantics

**Goal:** Establish cloud semantics as the main capability.

**Deliverables:** Versioned schemas; reproducible sanitized icons; core AWS catalog; three validation passes; relationship vocabulary; diagnostic registry; meaningful containment/relationship rules.

**Exit:** Every initial entry and rule outcome is tested across normal/strict/off; invalid/unknown cases render partial diagrams.

## Phase 4 — Production layout and SVG

**Goal:** Produce readable, deterministic, accessible compound diagrams.

**Deliverables:** Compound layout, ports, four directions, abortable worker, stale protection, cache, stable SVG, themes, accessibility, diagnostics, icons, mount helper.

**Exit:** Geometry, parity, determinism, safety, axe-core, and keyboard suites pass.

## Phase 5 — Reference playground

**Goal:** Deliver the focused authoring/debugging environment.

**Deliverables:** Monaco support; debounced/cancelled rendering; preview and synchronized selection; controls; examples; persistence; SVG copy/download; responsive accessible UI.

**Exit:** Chromium e2e covers editing, recovery, stale requests, navigation, persistence, and export; only public exports are consumed.

## Phase 6 — Hardening and MVP release

**Goal:** Publish dependable `0.1.0` packages and playground.

**Deliverables:** API/getting-started/package docs; clean-consumer tests; compatibility/performance budgets; SVG security and AWS licensing audits; complete CI; Changesets/npm provenance; deployed playground.

**Exit:** Foundation acceptance criteria and release dry-run pass; clean consumers reproduce documented SVG and diagnostics.

## After MVP

Expand AWS rules, add Firefox/WebKit CI before `1.0`, then consider GCP, CLI/Markdown, PNG/PDF, LSP, and measured Rust/Wasm optimization.
