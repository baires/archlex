---
"@archlex/model": minor
"@archlex/core": minor
"@archlex/diagnostics": minor
"@archlex/parser": minor
"@archlex/aws": minor
"@archlex/gcp": minor
"@archlex/k8s": minor
"@archlex/language-service": minor
---

Add editor-neutral ArchLex language intelligence, catalog search nomenclature, structured grammar metadata, provider relationship semantics, and canonical Monaco completion.

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
