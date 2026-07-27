export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

export interface SourceSpan {
  start: SourcePosition;
  end: SourcePosition;
}

export interface Diagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  span: SourceSpan;
  related?: readonly { message: string; span: SourceSpan }[];
  elements: readonly string[];
  remediation?: string;
}

export interface AstNode {
  type: string;
  span: SourceSpan;
}

export interface StatementAst extends AstNode {
  type: "relationship" | "resource" | "scope" | "directive";
}

export interface ResourceAst extends StatementAst {
  type: "resource";
  kind: string;
  name?: string;
  attributes?: Record<string, string>;
}

export interface ChainNodeAst {
  kind: string;
  name?: string;
  span: SourceSpan;
}

export interface RelationshipAst extends StatementAst {
  type: "relationship";
  left: ChainNodeAst;
  right: ChainNodeAst;
  arrow: string;
  label?: string;
}

export interface DirectiveAst extends StatementAst {
  type: "directive";
  name: string;
  value: string;
}

export interface DocumentAst extends AstNode {
  type: "document";
  statements: readonly StatementAst[];
}

export interface CloudNode {
  id: string;
  provider: string;
  serviceKind: string;
  name?: string;
  label: string;
  iconKey?: string;
  icon?: string;
  span: SourceSpan;
  attributes?: Record<string, string>;
}

export interface CloudEdge {
  id: string;
  source: string;
  target: string;
  arrow: string;
  label?: string;
  span: SourceSpan;
}

export interface CloudScope {
  id: string;
  kind: "account" | "region" | "vpc" | "subnet" | "group";
  name: string;
  childrenNodeIds: readonly string[];
}

export interface CloudGraph {
  nodes: readonly CloudNode[];
  edges: readonly CloudEdge[];
  scopes: readonly CloudScope[];
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  iconKey?: string;
  icon?: string;
  children?: readonly LayoutNode[];
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  points: readonly { x: number; y: number }[];
  label?: string;
}

export interface LayoutGraph {
  width: number;
  height: number;
  nodes: readonly LayoutNode[];
  edges: readonly LayoutEdge[];
}

export interface ParseResult {
  ast: DocumentAst;
  diagnostics: readonly Diagnostic[];
}

export interface AnalysisResult {
  graph: CloudGraph;
  diagnostics: readonly Diagnostic[];
}

export interface LayoutOptions {
  direction?: "LR" | "RL" | "TB" | "BT";
  signal?: AbortSignal;
}

export interface LayoutResult {
  graph: LayoutGraph;
  diagnostics: readonly Diagnostic[];
  metadata: { engine: string; fingerprint: string; durationMs: number };
}

export interface ElementMapping {
  elementId: string;
  svgId: string;
  span: SourceSpan;
  diagnosticCodes: readonly string[];
}

export interface SvgResult {
  svg: string;
  diagnostics: readonly Diagnostic[];
  mappings: readonly ElementMapping[];
  metadata: { renderer: string; width: number; height: number };
}

export interface RenderResult extends SvgResult {
  ast: DocumentAst;
  graph: CloudGraph;
  layout: LayoutGraph;
}

export interface CloudProvider {
  id: string;
  name: string;
  supports(serviceKind: string): boolean;
  resolveService(serviceKind: string): ServiceMetadata | undefined;
  validateGraph(graph: CloudGraph): readonly Diagnostic[];
}

export interface ServiceMetadata {
  id: string;
  displayName: string;
  iconKey?: string;
  iconSvg?: string;
}

export interface LayoutEngine {
  id: string;
  layout(graph: CloudGraph, options?: LayoutOptions): Promise<LayoutResult>;
}

export interface GraphRenderer {
  id: string;
  render(
    layoutGraph: LayoutGraph,
    diagnostics?: readonly Diagnostic[],
  ): SvgResult;
}

export class CloudMerAbortError extends Error {
  constructor(message = "Operation aborted") {
    super(message);
    this.name = "CloudMerAbortError";
  }
}

export class CloudMerInternalError extends Error {
  constructor(
    public stage: string,
    message: string,
    public cause?: unknown,
  ) {
    super(`[${stage}] Internal error: ${message}`);
    this.name = "CloudMerInternalError";
  }
}
