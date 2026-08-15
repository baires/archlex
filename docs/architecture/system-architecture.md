# System Architecture

## Runtime pipeline

ArchLex separates source processing from icon loading and SVG rendering:

```text
source
  -> parser                  AST and parse diagnostics
  -> core analyzer           graph and structural diagnostics
  -> selected provider       catalog metadata and semantic diagnostics
  -> prepare()               prepared graph and missing icon requests
  -> icon runtime            optional sanitized icon registry
  -> layout-elk              positioned compound graph
  -> renderer-svg            accessible SVG and element mappings
```

Call `render(source)` when bundled icons meet your needs. Call `prepare()`, load
`PreparedDiagram.iconRequests`, then call `renderPrepared()` when your
application wants CDN artwork. Both paths use the same analyzer, layout engine,
and renderer.

## Package boundaries

| Package | Responsibility |
| --- | --- |
| `@archlex/model` | Publishes AST, graph, provider, layout, render, and diagnostic types |
| `@archlex/parser` | Parses ArchLex source with Chevrotain and recovers partial ASTs |
| `@archlex/diagnostics` | Defines shared diagnostics and documentation metadata |
| `@archlex/aws` | Defines the AWS catalog, rules, bundled icons, and CDN mapping |
| `@archlex/gcp` | Defines the Google Cloud catalog, rules, bundled icons, and CDN mapping |
| `@archlex/k8s` | Defines the Kubernetes catalog, rules, bundled icons, and CDN mapping |
| `@archlex/icons-core` | Validates providers, fetches icons, sanitizes SVG, and manages shared loading behavior |
| `@archlex/icons-browser` | Stores sanitized icon records in application memory |
| `@archlex/icons-node` | Stores sanitized icon records in a TTL-aware filesystem cache |
| `@archlex/layout-elk` | Converts graphs to ELK, calculates geometry, and caches layouts |
| `@archlex/renderer-svg` | Serializes deterministic, accessible SVG without DOM APIs |
| `@archlex/core` | Coordinates parsing, analysis, providers, layout, and rendering |
| `@archlex/cli` | Exposes render, validate, examples, and diagnostic-reference commands in Node.js |

The parser does not import provider packages. Provider packages do not import
the parser, layout engine, renderer, or runtime icon adapters. Layout and
renderer packages do not interpret source syntax. Boundary tests enforce these
rules.

## Applications

| Application | Uses |
| --- | --- |
| Playground | React, Monaco, core, browser icon loading, SVG export |
| Docs | Nextra pages sourced from `docs/` through symlinks |
| Landing | Astro components and generated diagram assets |
| MCP server | Cloudflare Worker tools, prompts, examples, and embedded docs resources |

The MCP build copies hand-written `docs/` Markdown into generated TypeScript
resources. The docs app reads the same Markdown through `apps/docs/pages`
symlinks. One source edit can update both consumers.

## Scopes and providers

The parser recognizes six scope kinds:

- `account`, `region`, `vpc`, and `subnet` model cloud containment.
- `cluster` and `namespace` model Kubernetes containment.

Providers decide which resources belong in each scope. AWS, Google Cloud, and
Kubernetes use the same `CloudProvider` contract for catalog lookup and graph
validation. A new provider can reuse existing scopes without changing the
parser, layout engine, or renderer.

## Diagnostics and partial results

The parser, analyzer, provider, layout engine, and renderer return diagnostics
with the best result they can produce. Unknown resources keep generic nodes.
Invalid relationships keep recoverable edges when geometry remains possible.

Expected source problems do not throw. Cancellation throws `ArchLexAbortError`.
Broken internal contracts throw `ArchLexInternalError` with a pipeline stage and
optional cause.

## Determinism and cancellation

Stable IDs use containment paths and local instance IDs. Layout fingerprints
include geometry-relevant graph data, options, and engine version. They exclude
diagnostic prose, theme colors, selection, and icon artwork.

Browser layout requests carry an operation ID and `AbortSignal`. The playground
also checks its current operation before it applies a base render or hydrated
icon render. Older work cannot replace a newer diagram.

## SVG and icon safety

Provider packages bundle sanitized SVG fragments for common resources. Runtime
adapters fetch missing artwork from pinned, allowlisted sources. The sanitizer
rejects scripts, event handlers, external references, active animation,
unsupported namespaces, unsafe CSS, and oversized content.

The renderer accepts sanitized icon records. It does not fetch URLs. It emits
complete SVG with accessible names, focus attributes, deterministic IDs, and
fragment-local icon references.

## Extension points

Implement `CloudProvider` to add a catalog and semantic rules. Implement
`LayoutEngine` or `GraphRenderer` to replace layout or output behavior. Keep
these implementations behind interfaces from `@archlex/model` so applications
can compose them through `createArchLex`.

Read the [Contribution Guide](contribution-guide.md) for file paths, provider
examples, tests, changesets, and documentation requirements.
