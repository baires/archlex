---
title: Public API Specification
description: "ArchLex public API reference for createArchLex(), parse, analyze, prepare, layout, and render methods with TypeScript types and options."
---

# Public API Specification

## Create an instance

`@archlex/core` publishes ESM for Node.js and browsers. Register at least one
provider:

```ts
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
});
```

Core rejects duplicate provider IDs. If you register one provider, ArchLex can
use it as the default. If you register several, select one in the source or pass
an analysis provider option.

## Main interface

```ts
interface ArchLex {
  parse(source: string): ParseResult;
  analyze(ast: DocumentAst, options?: AnalyzeOptions): AnalysisResult;
  prepare(source: string, options?: PrepareOptions): PreparedDiagram;
  layout(graph: CloudGraph, options?: LayoutOptions): Promise<LayoutResult>;
  renderGraph(
    graph: LayoutGraph,
    diagnostics?: readonly Diagnostic[],
    theme?: ThemeName,
  ): SvgResult;
  renderPrepared(
    prepared: PreparedDiagram,
    options?: RenderPreparedOptions,
  ): Promise<RenderResult>;
  render(
    source: string,
    options?: RenderPipelineOptions,
  ): Promise<RenderResult>;
  getCatalog(providerFilter?: string): CatalogMetadata;
}
```

Use `render()` for the shortest path. Use the lower-level methods when an editor,
CLI, or service needs stage control.

## Prepare and hydrate icons

`prepare()` parses and analyzes once:

```ts
interface PreparedDiagram {
  readonly ast: DocumentAst;
  readonly graph: CloudGraph;
  readonly diagnostics: readonly Diagnostic[];
  readonly iconRequests: readonly IconRequest[];
  readonly direction?: "LR" | "RL" | "TB" | "BT";
  readonly theme?: "light" | "dark";
}
```

Load `iconRequests` with `@archlex/icons-browser` or
`@archlex/icons-node`. Pass the returned registry to `renderPrepared()` through
the `icons` option. The renderer uses bundled icons when no registry entry
exists.

## Options

```ts
interface ArchLexOptions {
  providers: readonly CloudProvider[];
  defaultProvider?: string;
  layoutEngine?: LayoutEngine;
  renderer?: GraphRenderer;
}

interface RenderPipelineOptions {
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "normal" | "strict" | "off";
  theme?: "light" | "dark";
  signal?: AbortSignal;
  icons?: IconRegistry;
}
```

Per-call options override source directives. Source directives override engine
defaults. Pass one `AbortSignal` through icon loading and rendering when newer
work can replace an operation.

## Results

`render()` and `renderPrepared()` return the AST, analyzed graph, positioned
layout, SVG, diagnostics, element mappings, and render metadata.

Diagnostics keep their pipeline order. Each diagnostic includes a stable code,
severity, source span, element IDs, and optional remediation. Messages may
improve in a minor release, so applications should branch on codes.

Expected source errors produce partial results. Cancellation throws
`ArchLexAbortError`. Internal invariant failures throw `ArchLexInternalError`.

## Catalog inspection

`getCatalog()` returns registered provider metadata, services, aliases, allowed
containment, directives, six scope kinds, and known relationship kinds. Pass
`aws`, `gcp`, `k8s`, or `all` to filter provider data.

Relationship entries carry an `area` grouping, and each provider's
`relationships` list declares the kinds it validates with optional
`allowedSources`/`allowedTargets` catalog constraints. Provider-owned kinds
outside the core vocabulary set `providerSpecific: true`. Relationship
`searchTerms` are included in editor filtering.

The catalog includes search terms extracted from service names and descriptions
for fuzzy matching in editor completions.

## Language Intelligence

`@archlex/language-service` provides editor-neutral language intelligence with
context-aware completions:

```ts
import { createCompletionEngine, analyzeLanguageDocument } from "@archlex/language-service";

const catalog = archlex.getCatalog();
const engine = createCompletionEngine(catalog);

const source = "provider aws\nservice: elastic kubernetes";
const document = analyzeLanguageDocument(source);
const completions = engine.complete(document, source.length);
// Returns: [{ label: "Amazon EKS", insertText: "eks", kind: "resource", ... }]
```

### Features

- **Catalog-driven**: All 441 services (194 AWS, 185 GCP, 62 K8s) with relationships
- **Human-readable search**: Fuzzy matching against display names and descriptions
- **Context-aware**: Filters by provider, scope hierarchy, grammar position, and symbol visibility
- **Semantic ranking**: Orders by prefix match, search relevance, and relationship compatibility
- **Canonical insertion**: Always inserts lowercase kebab-case syntax

### Grammar Context

The completion engine detects cursor position in the grammar:

- **Directive name**: `prov█` → `provider`, `direction`, `validation`
- **Directive value**: `provider █` → `aws`, `gcp`, `k8s`
- **Resource kind**: `service: █` → provider-specific services
- **Relationship type**: `a -[█` → valid relationships for declared resources
- **Relationship target**: `a -[writes]-> █` → declared identifiers

### Editor Integration

The language service is DOM-neutral and works with any editor. Convert between
editor-specific positions/ranges and universal byte offsets. Monaco, VSCode,
CodeMirror, and Vim mode integrations use the same completion engine.

## Browser mounting

Import `mountSvg` from `@archlex/core/browser`. It parses ArchLex-generated SVG,
rejects a malformed or non-SVG root, replaces the target element's children,
and returns the mounted `SVGSVGElement`.

Use `ElementMapping` and `data-archlex-*` attributes to connect source spans,
diagnostics, and SVG selection. Renderer CSS classes do not form part of the
public API.
