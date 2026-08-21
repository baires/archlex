---
title: Playground Specification
description: "ArchLex playground specification, covering the Monaco editor, context-aware completions, live diagnostics, SVG preview, examples, and export tools."
---

# Playground Specification

## Purpose

The playground gives you a reference editor for ArchLex source. It combines
Monaco, live diagnostics, a rendered SVG preview, provider examples, settings,
and export tools in one browser application.

## Layout and examples

Desktop screens use a resizable editor and preview split. Narrow screens use
Editor and Preview tabs. The command bar exposes examples, direction,
validation, theme, documentation, import, export, and fullscreen controls.

The example selector groups entries by AWS, Google Cloud, and Kubernetes, then
orders them by use case. Kubernetes examples cover microservices ingress,
stateful storage, scheduled batch work, autoscaling and disruption protection,
and namespace RBAC.

## Language support

Monaco highlights directives, scope keywords, relationships, comments, and
provider resources.

The editor provides **context-aware completions** backed by the language service:

- **Catalog-driven suggestions**: All 441 resources (194 AWS, 185 GCP, 62 K8s) with relationships and containment rules
- **Human-readable search**: Type "elastic kubernetes" to find Amazon EKS, or "relational" for RDS and Aurora
- **Grammar-aware filtering**: Different suggestions after `:` (resource kinds), `[` (relationships), or in directive positions
- **Symbol visibility**: Declared identifiers appear as relationship targets
- **Semantic ranking**: Results ordered by prefix match, search relevance, and relationship compatibility
- **Canonical insertion**: Always inserts lowercase kebab-case syntax (`eks`, `cloud-run`, `statefulset`)

Completions trigger automatically on `:`, `.`, `[`, `-` or manually with `Ctrl+Space`. The suggestion widget shows human-readable display names (e.g., "Amazon EKS") while inserting canonical syntax (e.g., `eks`).

Kubernetes support includes `cluster`, `namespace`, and resource aliases such as `deploy`, `svc`, and `pvc`.

The editor shows parse, structural, and provider diagnostics at their source
spans. Code actions can apply supported remediation edits. Hover documentation provides directive and service descriptions.

## Progressive rendering

Source and setting changes debounce before rendering. Each operation prepares
the source once, starts the base render, and loads missing provider icons in
parallel.

The playground displays the base SVG as soon as layout finishes. The status bar
shows `Ready` with base render duration while a separate `Loading icons…`
message tracks hydration. When icon loading finishes, `renderPrepared()` reuses
cached geometry and replaces only the SVG artwork.

Each operation owns an `AbortController` and operation ID. A stale base render or
icon hydration result cannot replace newer output. An icon failure keeps the
base diagram and clears the loading state.

## Selection and persistence

SVG selection uses `data-archlex-id` and `ElementMapping` to reveal source.
Cursor movement highlights the narrowest mapped element. Selection styling does
not enter exported SVG.

Versioned local state stores source, example or custom mode, explicit settings,
theme, and pane sizes. Invalid JSON and unsupported versions fall back to the
default source and layout.

## Import and export

You can import source from a file or URL. Copy and download actions use the
latest successful SVG. PNG export rasterizes that SVG. Exported output includes
theme and accessibility data but excludes playground selection state.

## Accessibility

Keyboard users can reach controls, resize panes, switch narrow-screen tabs, and
navigate SVG elements. Focus survives hydrated SVG replacement. Diagnostic
counts use live announcements without replaying the full list after each edit.

## Verification

Unit tests cover render concurrency, icon hydration, status state, workspace
persistence, transforms, export, and command-bar grouping. Browser tests cover
responsive layout, keyboard use, CDN fixture routing, selection, and visual
output.
