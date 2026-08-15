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

## Browser mounting

Import `mountSvg` from `@archlex/core/browser`. It parses ArchLex-generated SVG,
rejects a malformed or non-SVG root, replaces the target element's children,
and returns the mounted `SVGSVGElement`.

Use `ElementMapping` and `data-archlex-*` attributes to connect source spans,
diagnostics, and SVG selection. Renderer CSS classes do not form part of the
public API.
