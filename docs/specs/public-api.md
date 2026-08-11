# Public API Specification

## Exports

`@archlex/core` is ESM-only. Browser helpers use `@archlex/core/browser`.

```ts
interface ArchLex {
  parse(source: string): ParseResult;
  analyze(ast: DocumentAst, options?: AnalyzeOptions): AnalysisResult;
  layout(graph: CloudGraph, options?: LayoutOptions): Promise<LayoutResult>;
  renderGraph(graph: LayoutGraph, options?: RenderOptions): SvgResult;
  render(source: string, options?: RenderPipelineOptions): Promise<RenderResult>;
}

function createArchLex(options: ArchLexOptions): ArchLex;
function mountSvg(container: Element, svg: string): SVGSVGElement;
```

AWS is not bundled into core; consumers pass `awsProvider()`. Construction requires one provider and rejects duplicate provider IDs.

## Options and precedence

```ts
interface ArchLexOptions {
  providers: readonly CloudProvider[];
  defaultProvider?: string;
  layoutEngine?: LayoutEngine;
  renderer?: GraphRenderer;
}

type ThemeName = "light" | "dark";

interface RenderPipelineOptions {
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "normal" | "strict" | "off";
  theme?: ThemeName;
  signal?: AbortSignal;
}
```

Per-call `theme` option overrides source `theme` directive, which overrides the renderer's default (`"dark"`). Direction and validation follow the same pattern. Provider defaults to the sole registered provider or requires explicit selection when multiple are registered.

## Results

```ts
interface ParseResult { ast: DocumentAst; diagnostics: readonly Diagnostic[] }
interface AnalysisResult { graph: CloudGraph; diagnostics: readonly Diagnostic[] }
interface LayoutResult {
  graph: LayoutGraph;
  diagnostics: readonly Diagnostic[];
  metadata: { engine: string; fingerprint: string; durationMs: number };
}
interface SvgResult {
  svg: string;
  diagnostics: readonly Diagnostic[];
  mappings: readonly ElementMapping[];
  metadata: { renderer: string; width: number; height: number };
}
interface RenderResult extends SvgResult {
  ast: DocumentAst;
  graph: CloudGraph;
  layout: LayoutGraph;
}
```

Diagnostics accumulate in parse, structural, provider, guidance, layout, and render order, deduplicated by code, primary span, and element IDs.

```ts
interface Diagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  span: SourceSpan;
  related?: readonly { message: string; span: SourceSpan }[];
  elements: readonly string[];
  remediation?: string;
}

interface ElementMapping {
  elementId: string;
  svgId: string;
  span: SourceSpan;
  diagnosticCodes: readonly string[];
}
```

Codes are programmatically stable; messages may improve in minor versions. SVG and graph IDs remain stable for semantically unchanged input within one major version.

## AST and graph label contracts

`ResourceAst` and `ChainNodeAst` carry an optional `displayLabel`: the decoded text of the `["..."]` form. A node's visible label resolves as display label, then instance name, then service display name. `CloudNode` and `LayoutNode` carry an optional `accessibleName`, present when the visible label differs from the service display name and combining both as `"<label> (<Service Display Name>)"`. Conflicting display labels for one instance are diagnosed with informational `AL-STRUCT-CONFLICTING-LABEL`; the first label wins.

## Partial results, cancellation, and failures

Expected source errors do not reject. Invalid elements remain when generic geometry is possible; otherwise rendering returns a valid accessible empty-state SVG. `layout` and `render` accept `AbortSignal`; abortion throws `ArchLexAbortError` and is never a diagnostic.

Unexpected invariant failures throw `ArchLexInternalError` with stage (`parse`, `analyze`, `layout`, or `render`) and optional cause.

## Browser mounting

`mountSvg` parses ArchLex output as `image/svg+xml`, rejects parse errors or a non-SVG root, imports the node, replaces container children, and returns the root. Renderer output never contains scripts, event attributes, active content, or external resources.

`ElementMapping` plus `data-archlex-*` attributes are public editor integration points. Renderer CSS classes are not public API.
