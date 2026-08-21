# @archlex/k8s

## 0.4.0

### Minor Changes

- 5ad0f4a: Enforce declared Kubernetes relationship constraints.

  - Add `K8S-RELATIONSHIP-INVALID-ENDPOINT-001`: warns when a typed
    relationship (`targets`, `routes`, `mounts`, `binds`, `scales`,
    `schedules-on`) connects resources that violate the declared
    `allowedSources`/`allowedTargets` in `K8S_RELATIONSHIPS` (promoted
    to an error in `strict` mode). Previously these constraints were only used
    for editor completion scoring.
  - The ingress topology rule no longer reports edges typed `routes`; those are
    validated by the new relationship rule instead, avoiding duplicate
    diagnostics.
  - Mark Kubernetes-only relationship kinds as explicit provider extensions.

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

- Updated dependencies [f53538f]
  - @archlex/model@0.5.0

## 0.2.0

### Minor Changes

- 29e730b: Add the initial Kubernetes provider with a 62-resource catalog, official icons,
  cluster and namespace scopes, and semantic validation. Safely normalize inert
  editor metadata when loading official SVGs at runtime.

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/model@0.4.0
  - @archlex/icons-core@0.2.3
