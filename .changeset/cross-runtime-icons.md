---
"@archlex/icons-core": minor
"@archlex/icons-browser": minor
"@archlex/icons-node": minor
"@archlex/core": minor
"@archlex/aws": patch
"@archlex/gcp": patch
"@archlex/playground": patch
---

Add explicit browser and Node icon-loading adapters backed by a shared
browser-safe core, version-pinned AWS and GCP provider definitions, and core
prepare/load/render APIs. The playground now fetches missing icons with
fixture-covered fallback behavior while preserving a static browser bundle.
