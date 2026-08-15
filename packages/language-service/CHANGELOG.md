# @archlex/language-service

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
