# @archlex/cli

## 0.3.4

### Patch Changes

- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
  - @archlex/aws@0.4.0
  - @archlex/gcp@0.4.0
  - @archlex/k8s@0.4.0
  - @archlex/model@0.6.0
  - @archlex/core@0.5.0
  - @archlex/diagnostics@0.3.1

## 0.3.3

### Patch Changes

- Updated dependencies [16b8844]
- Updated dependencies [f53538f]
  - @archlex/diagnostics@0.3.0
  - @archlex/model@0.5.0
  - @archlex/core@0.4.0
  - @archlex/aws@0.3.0
  - @archlex/gcp@0.3.0
  - @archlex/k8s@0.3.0

## 0.3.2

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/k8s@0.2.0
  - @archlex/model@0.4.0
  - @archlex/core@0.3.2
  - @archlex/aws@0.2.3
  - @archlex/diagnostics@0.2.3
  - @archlex/gcp@0.2.4

## 0.3.1

### Patch Changes

- Updated dependencies [8eb714b]
  - @archlex/gcp@0.2.3

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

### Patch Changes

- Updated dependencies [12dd3ec]
  - @archlex/model@0.3.0
  - @archlex/core@0.3.0
  - @archlex/aws@0.2.2
  - @archlex/diagnostics@0.2.2
  - @archlex/gcp@0.2.2

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.
- Updated dependencies [69fac46]
  - @archlex/aws@0.2.1
  - @archlex/core@0.2.1
  - @archlex/diagnostics@0.2.1
  - @archlex/gcp@0.2.1
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

- Updated dependencies [fa3c5af]
- Updated dependencies [ced0859]
- Updated dependencies [8fcbb08]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
  - @archlex/core@0.2.0
  - @archlex/aws@0.2.0
  - @archlex/gcp@0.2.0
  - @archlex/model@0.2.0
  - @archlex/diagnostics@0.2.0
