---
"@archlex/aws": patch
"@archlex/cli": patch
"@archlex/core": patch
"@archlex/diagnostics": patch
"@archlex/gcp": patch
"@archlex/icons": patch
"@archlex/icons-browser": patch
"@archlex/icons-core": patch
"@archlex/icons-node": patch
"@archlex/layout-elk": patch
"@archlex/model": patch
"@archlex/parser": patch
"@archlex/renderer-svg": patch
---

Remove the redundant `typecheck` script from packages whose `build` already
runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
`tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
standalone `typecheck` script.
