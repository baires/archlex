# System Architecture

## Pipeline

```text
source
  -> @cloudmer/parser        recoverable AST + syntax diagnostics
  -> @cloudmer/core          symbol resolution + structural graph
  -> provider packages      catalog resolution + semantic diagnostics
  -> @cloudmer/layout-elk   positioned compound graph
  -> @cloudmer/renderer-svg deterministic SVG string
```

Expected source problems are data, not exceptions. Each stage returns the best partial result and diagnostics. Only internal invariant failures throw `CloudMerInternalError`.

## Packages and dependency rules

| Package | Responsibility | May depend on |
| --- | --- | --- |
| `@cloudmer/model` | AST, graph, diagnostics, provider, layout, render types | Runtime-free utilities |
| `@cloudmer/parser` | Chevrotain lexer/CST and CST-to-AST conversion | `model`, Chevrotain |
| `@cloudmer/aws` | AWS catalog, icons, aliases, containment, semantic rules | `model` |
| `@cloudmer/gcp` | GCP catalog, icons, aliases, containment, semantic rules | `model` |
| `@cloudmer/layout-elk` | ELK adapter, worker protocol, positioned graph | `model`, ELK.js |
| `@cloudmer/renderer-svg` | Deterministic DOM-free SVG serialization | `model` |
| `@cloudmer/core` | Orchestration, structural analysis, provider registry | Library packages through public exports |
| `apps/playground` | Reference React editor | `core` public API only |

Parser cannot import providers; providers cannot import parser, layout, or renderer; layout and renderer cannot interpret source; reusable packages cannot import React or Monaco. Automated boundary tests enforce this matrix.

## Internal Package Structure Conventions

To ensure scalable growth and ease of contribution:

- `@cloudmer/aws`: `src/catalog/`, `src/icons/`, `src/rules/`, `src/builder.ts`, `src/registry.ts`, `src/index.ts`.
- `@cloudmer/gcp`: `src/catalog/`, `src/icons/`, `src/rules/`, `src/builder.ts`, `src/registry.ts`, `src/index.ts`.
- `@cloudmer/parser`: `src/lexer/`, `src/cst/`, `src/visitor/`, `src/recovery/`, `src/index.ts`.
- `@cloudmer/layout-elk`: `src/adapter/`, `src/worker/`, `src/cache/`, `src/index.ts`.
- `@cloudmer/renderer-svg`: `src/serializer/`, `src/theme/`, `src/accessibility/`, `src/index.ts`.
- `@cloudmer/core`: `src/pipeline/`, `src/browser.ts`, `src/index.ts`.

See [Contribution & Extension Guide](contribution-guide.md) for step-by-step developer workflows.

## Data ownership

- Parser owns a CloudMer AST; Chevrotain CST types never leave its package.
- Analyzer owns stable instance IDs, symbol tables, containment, and `CloudGraph`.
- Providers enrich graph elements and emit diagnostics without mutating the AST.
- Layout owns geometry only; it cannot decide validity, icons, semantics, or style meaning.
- Renderer owns SVG structure and presentation only.
- Stable IDs and source spans preserve source-to-element mapping through every stage.

## Runtime and worker boundaries

Public packages are ESM and support Node.js 22 without browser polyfills. Browser layout uses an ELK Web Worker by default. Requests carry a protocol version and monotonically increasing ID; `AbortSignal` sends cancellation, and callers discard stale results. The inline adapter implements the same interface for Node and tests.

`mountSvg` is exported from a browser subpath. It parses trusted CloudMer-generated SVG, replaces container contents, and returns `SVGSVGElement`. Raw user HTML is never accepted.

## Errors, determinism, and caching

- Parse errors produce `CM-PARSE-*`; structural errors produce `CM-STRUCT-*`; provider errors use stable provider-prefixed codes.
- Unknown resources and relationships render as generic elements with `info` diagnostics.
- Abortion throws `CloudMerAbortError`, never a source diagnostic.
- Broken contracts or impossible stage states throw `CloudMerInternalError` with stage and cause.
- Parsing and analysis are deterministic for source plus catalog version.
- Layout fingerprints include geometry-relevant graph data, options, and engine version, but exclude diagnostic prose, selection, and theme colors.
- SVG definitions and elements sort by stable ID and use consistent numeric formatting.

## Extension model

Providers implement interfaces from `@cloudmer/model`. Adding GCP must not require grammar, layout, or renderer changes. Alternative layout engines and renderers implement the corresponding model interface and are selected by `createCloudMer`.
