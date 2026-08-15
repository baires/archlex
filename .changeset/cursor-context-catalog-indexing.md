---
"@archlex/language-service": minor
---

Add cursor context and catalog indexing

- Add `getCursorContext()` for detecting syntactic position (resource-kind, directive-value, etc.)
- Add `createCatalogIndex()` for O(1) alias resolution and multi-word fuzzy search
- Support scope path detection for nested completions
- Normalize search terms for case-insensitive matching
