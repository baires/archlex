import { awsProvider } from "@cloudmer/aws";
import { createInlineLayoutEngine } from "@cloudmer/layout-elk";
import type {
  AnalysisResult,
  CloudEdge,
  CloudGraph,
  CloudNode,
  CloudProvider,
  Diagnostic,
  DocumentAst,
  GraphRenderer,
  LayoutEngine,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  ParseResult,
  RelationshipAst,
  RenderResult,
  SvgResult,
} from "@cloudmer/model";
import { parse as parseSource } from "@cloudmer/parser";
import { createSvgRenderer } from "@cloudmer/renderer-svg";

export interface CloudMerOptions {
  providers: readonly CloudProvider[];
  defaultProvider?: string;
  layoutEngine?: LayoutEngine;
  renderer?: GraphRenderer;
}

export interface RenderPipelineOptions {
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "normal" | "strict" | "off";
  theme?: "light" | "dark";
  signal?: AbortSignal;
}

export interface CloudMer {
  parse(source: string): ParseResult;
  analyze(ast: DocumentAst): AnalysisResult;
  layout(graph: CloudGraph, options?: LayoutOptions): Promise<LayoutResult>;
  renderGraph(
    graph: LayoutGraph,
    diagnostics?: readonly Diagnostic[],
  ): SvgResult;
  render(
    source: string,
    options?: RenderPipelineOptions,
  ): Promise<RenderResult>;
}

export function createCloudMer(options: CloudMerOptions): CloudMer {
  if (!options.providers || options.providers.length === 0) {
    throw new Error("createCloudMer requires at least one provider.");
  }

  const providerMap = new Map<string, CloudProvider>();
  for (const p of options.providers) {
    if (providerMap.has(p.id)) {
      throw new Error(`Duplicate provider registered: ${p.id}`);
    }
    providerMap.set(p.id, p);
  }

  const defaultProvider = options.defaultProvider ?? options.providers[0].id;
  const layoutEngine = options.layoutEngine ?? createInlineLayoutEngine();
  const renderer = options.renderer ?? createSvgRenderer();

  return {
    parse(source: string): ParseResult {
      return parseSource(source);
    },

    analyze(ast: DocumentAst): AnalysisResult {
      const nodesMap = new Map<string, CloudNode>();
      const edges: CloudEdge[] = [];
      const diagnostics: Diagnostic[] = [];

      for (const stmt of ast.statements) {
        if (stmt.type === "relationship") {
          const rel = stmt as RelationshipAst;
          const leftKind = rel.left.kind;
          const rightKind = rel.right.kind;

          if (!nodesMap.has(leftKind)) {
            nodesMap.set(leftKind, {
              id: leftKind,
              provider: defaultProvider,
              serviceKind: leftKind,
              label: leftKind,
              span: rel.left.span,
            });
          }

          if (!nodesMap.has(rightKind)) {
            nodesMap.set(rightKind, {
              id: rightKind,
              provider: defaultProvider,
              serviceKind: rightKind,
              label: rightKind,
              span: rel.right.span,
            });
          }

          edges.push({
            id: `${leftKind}-${rel.arrow}-${rightKind}`,
            source: leftKind,
            target: rightKind,
            arrow: rel.arrow,
            span: rel.span,
          });
        }
      }

      const graph: CloudGraph = {
        nodes: Array.from(nodesMap.values()),
        edges,
        scopes: [],
      };

      const provider = providerMap.get(defaultProvider);
      if (provider) {
        diagnostics.push(...provider.validateGraph(graph));
      }

      return { graph, diagnostics };
    },

    async layout(
      graph: CloudGraph,
      layoutOptions?: LayoutOptions,
    ): Promise<LayoutResult> {
      return layoutEngine.layout(graph, layoutOptions);
    },

    renderGraph(
      graph: LayoutGraph,
      diagnostics?: readonly Diagnostic[],
    ): SvgResult {
      return renderer.render(graph, diagnostics);
    },

    async render(
      source: string,
      renderOptions?: RenderPipelineOptions,
    ): Promise<RenderResult> {
      const parseRes = this.parse(source);
      const analysisRes = this.analyze(parseRes.ast);

      const layoutRes = await this.layout(analysisRes.graph, {
        direction: renderOptions?.direction,
        signal: renderOptions?.signal,
      });

      const combinedDiagnostics = [
        ...parseRes.diagnostics,
        ...analysisRes.diagnostics,
        ...layoutRes.diagnostics,
      ];

      const svgRes = this.renderGraph(layoutRes.graph, combinedDiagnostics);

      return {
        ...svgRes,
        ast: parseRes.ast,
        graph: analysisRes.graph,
        layout: layoutRes.graph,
      };
    },
  };
}

export { awsProvider };
