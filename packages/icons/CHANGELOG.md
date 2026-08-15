# @archlex/icons

## 0.2.3

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/icons-core@0.2.3
  - @archlex/icons-node@0.2.3

## 0.2.2

### Patch Changes

- 8eb714b: Fix SVG sanitizer stripping inline presentation styles and bundle GCP Private Service Connect icon

  - Inline presentation attributes (`fill`, `stroke`, etc.) are now extracted from element `style="..."` attributes during SVG sanitization before non-allowed attributes are removed. This prevents CDN and external icons with inline styles from rendering as solid black shapes.
  - Added official artwork for `gcp.private-service-connect` (`private-service-connect.svg`) to `@archlex/gcp` bundled icons catalog.

- Updated dependencies [8eb714b]
  - @archlex/icons-core@0.2.2
  - @archlex/icons-node@0.2.2

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.
- Updated dependencies [69fac46]
  - @archlex/icons-core@0.2.1
  - @archlex/icons-node@0.2.1

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

- Updated dependencies [fa3c5af]
- Updated dependencies [ced0859]
  - @archlex/icons-core@0.2.0
  - @archlex/icons-node@0.2.0
