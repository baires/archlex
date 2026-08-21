# @archlex/diagnostics

## 0.3.1

### Patch Changes

- Updated dependencies [5ad0f4a]
  - @archlex/model@0.6.0

## 0.3.0

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

### Patch Changes

- 16b8844: Add language-service package and enhance catalog validation

  - Add @archlex/language-service package for editor-neutral language intelligence
  - Retain comment tokens in parser lexer for language analysis
  - Add relationship validation test coverage

- Updated dependencies [f53538f]
  - @archlex/model@0.5.0

## 0.2.3

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/model@0.4.0

## 0.2.2

### Patch Changes

- Updated dependencies [12dd3ec]
  - @archlex/model@0.3.0

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.
- Updated dependencies [69fac46]
  - @archlex/model@0.2.1

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

### Patch Changes

- Updated dependencies [ced0859]
- Updated dependencies [8fcbb08]
  - @archlex/model@0.2.0
