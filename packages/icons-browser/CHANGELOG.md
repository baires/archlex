# @archlex/icons-browser

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.
- Updated dependencies [69fac46]
  - @archlex/icons-core@0.2.1

## 0.2.0

### Minor Changes

- fa3c5af: Add explicit browser and Node icon-loading adapters backed by a shared
  browser-safe core, version-pinned AWS and GCP provider definitions, and core
  prepare/load/render APIs. The playground now fetches missing icons with
  fixture-covered fallback behavior while preserving a static browser bundle.

### Patch Changes

- Updated dependencies [fa3c5af]
- Updated dependencies [ced0859]
  - @archlex/icons-core@0.2.0
