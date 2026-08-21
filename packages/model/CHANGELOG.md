# @archlex/model

## 0.6.0

### Minor Changes

- 5ad0f4a: Expand the core relationship vocabulary and add relationship areas.

  - Add `area` to `RelationshipDefinition` (`connectivity`, `data`, `events`,
    `operations`, `processing`, `delivery`, `governance`, `lifecycle`,
    `dependency`, `reliability`) so the documentation grouping is code-driven.
  - Add 11 new relationship kinds: `streams`, `stores`, `backs-up`, `restores`,
    `archives`
    (data), `notifies` (events), `provisions` (delivery), `authenticates`,
    `authorizes`, `audits`, `scans` (governance).
  - Add `depends-on` and `attaches` (dependency), `exposes` (connectivity),
    `fails-over-to` (reliability), and `trusts` (governance).
  - Group all core relationship metadata by area in
    `ARCHLEX_LANGUAGE_METADATA`.
  - Add searchable metadata to every core relationship and expose intentional
    provider extensions through `RelationshipDefinition.providerSpecific`.

## 0.5.0

### Minor Changes

- f53538f: Add editor-neutral ArchLex language intelligence, catalog search nomenclature, structured grammar metadata, provider relationship semantics, and canonical Monaco completion.

  **Language Service Package:**

  - Context-aware completion engine with catalog-driven suggestions
  - Human-readable search with fuzzy matching (e.g., "elastic kubernetes" → `eks`)
  - Grammar-aware filtering (directive values, resource kinds, relationships, scope keywords)
  - Semantic ranking by prefix match, search relevance, and relationship compatibility
  - DOM-neutral design compatible with Monaco, VSCode, CodeMirror, and other editors

  **Catalog Enhancements:**

  - Search terms extracted from service names and descriptions for all 441 resources
  - Structured metadata for 194 AWS, 185 GCP, and 62 Kubernetes services
  - Relationship compatibility validation (source/target kind pairs)
  - Containment rules for scope-aware suggestions

  **Parser Integration:**

  - Document analysis extracting provider, scope hierarchy, and symbol declarations
  - Cursor context detection identifying grammar position for completions
  - Symbol visibility tracking for relationship target suggestions

  **Playground Integration:**

  - Monaco completion provider backed by language service
  - Browser-tested performance (<50ms p95 on 100+ declaration documents)
  - WeakMap-based document caching for incremental updates
  - Performance measurement with `performance.measure()`

## 0.4.0

### Minor Changes

- 29e730b: Add the initial Kubernetes provider with a 62-resource catalog, official icons,
  cluster and namespace scopes, and semantic validation. Safely normalize inert
  editor metadata when loading official SVGs at runtime.

## 0.3.0

### Minor Changes

- 12dd3ec: Add `theme` DSL directive for light/dark rendering

  The `theme` directive allows specifying `light` or `dark` theme directly in ArchLex source:

  ```archlex
  provider aws
  theme light
  rds > ecs
  ```

  - Parser now recognizes `theme` as a reserved word and accepts both `theme dark` and `theme: dark` syntax (optional colon, consistent with other directives)
  - Core extracts the theme directive and passes it through the render pipeline with precedence: explicit API/CLI option > source directive > renderer default (`dark`)
  - CLI `--theme` flag no longer defaults to `dark`, allowing source directives to take effect
  - Playground syncs the theme toggle to reflect valid source directives
  - `ThemeName` type exported from `@archlex/model` for type safety

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.

## 0.2.0

### Minor Changes

- ced0859: Initial public release of ArchLex packages

  This is the first public release of ArchLex, a declarative language for cloud architecture diagrams.

  ### Core Features

  - **@archlex/core**: Complete diagramming engine with parse, compile, and render pipeline
  - **@archlex/aws**: AWS provider with 200+ official service icons
  - **@archlex/gcp**: GCP provider with 100+ official service icons
  - **@archlex/cli**: Command-line interface for rendering and validating diagrams
  - **@archlex/model**: TypeScript type definitions and data models
  - **@archlex/parser**: Fast Chevrotain-based DSL parser
  - **@archlex/diagnostics**: Diagnostic and validation utilities
  - **@archlex/renderer-svg**: SVG rendering engine
  - **@archlex/layout-elk**: Automatic graph layout using ELK
  - **@archlex/icons-core**: Icon utilities and registry
  - **@archlex/icons**: Node.js icon loading utilities

  ### Key Capabilities

  - Declarative DSL for architecture diagrams
  - Automatic layout and positioning
  - SVG and PNG export
  - Semantic validation
  - Multiple cloud providers
  - Extensible architecture
  - TypeScript support
  - CLI and programmatic API

- 8fcbb08: Add node display labels (`db: rds["Primary DB"]`, including on chain nodes), show instance names for named resources with the service name preserved in the accessible name, pick label-aware card widths (128/160/192) so canonical service names stop truncating, and deduplicate icon artwork into shared `<symbol>` definitions referenced by `<use>`.
