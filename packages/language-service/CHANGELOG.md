# @archlex/language-service

## 0.2.0

### Minor Changes

- e66a3c3: Add cursor context and catalog indexing

  - Add `getCursorContext()` for detecting syntactic position (resource-kind, directive-value, etc.)
  - Add `createCatalogIndex()` for O(1) alias resolution and multi-word fuzzy search
  - Support scope path detection for nested completions
  - Normalize search terms for case-insensitive matching

- 16b8844: Add language-service package and enhance catalog validation

  - Add @archlex/language-service package for editor-neutral language intelligence
  - Retain comment tokens in parser lexer for language analysis
  - Add relationship validation test coverage

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

- bc65720: Implement resource, directive, scope, and snippet completion with catalog-driven matching and semantic ranking. Adds CompletionEngine with text scoring tiers, provider-aware completions, and relationship merging.

### Patch Changes

- Updated dependencies [16b8844]
- Updated dependencies [f53538f]
  - @archlex/parser@0.6.0
  - @archlex/model@0.5.0

## 0.1.0

### Minor Changes

- **Language Intelligence**: Added editor-neutral language intelligence with context-aware completions

  - `analyzeLanguageDocument()` - Parse ArchLex source and extract structured metadata
  - `createCompletionEngine()` - Create catalog-backed completion engine
  - `getCursorContext()` - Determine syntactic position for context-aware suggestions
  - `createCatalogIndex()` - Fast O(1) resource lookup and fuzzy search

- **Catalog-Driven Completions**: All suggestions derived from provider catalogs

  - 194 AWS services with relationships and containment rules
  - 185 GCP services with relationships and containment rules
  - 62 Kubernetes resources with relationships and containment rules

- **Human-Readable Search**: Fuzzy matching against service names and descriptions

  - Search terms extracted from catalog metadata
  - Multi-word query support (e.g., "elastic kubernetes" → `eks`)
  - Ranked by relevance and prefix match quality

- **Context-Aware Filtering**: Suggestions filtered by grammar position and document state

  - Provider-specific resources (only AWS services when `provider aws`)
  - Scope-aware containment (only valid children in current scope)
  - Symbol visibility (declared identifiers for relationships)
  - Grammar context (different suggestions after `:`, `[`, in directives)

- **Semantic Ranking**: Intelligent ordering of completion results

  - Exact prefix matches ranked highest
  - Search term relevance scoring
  - Relationship compatibility validation

- **Canonical Insertion**: Completions always insert canonical syntax

  - Lowercase kebab-case for service kinds (`eks`, `cloud-run`)
  - Lowercase for relationships (`forwards`, `connects`)
  - Proper directive formatting (`provider aws`, `direction LR`)

- **Performance**: Optimized for browser and editor environments

  - Document caching with version tracking
  - Fast catalog lookups (O(1) resource access)
  - Tested <50ms p95 latency on 100+ declaration documents

- **DOM-Neutral Design**: Works in any JavaScript environment
  - No browser or editor dependencies
  - Compatible with Monaco, VSCode, CodeMirror, etc.
  - Immutable data structures throughout
