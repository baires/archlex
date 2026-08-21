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
  type: "relationship" | "resource" | "scope" | "directive" | "invalid";
}

export interface ResourceAst extends StatementAst {
  type: "resource";
  kind: string;
  name?: string;
  displayLabel?: string;
  attributes?: Record<string, string>;
}

export interface ChainNodeAst {
  kind: string;
  name?: string;
  displayLabel?: string;
  span: SourceSpan;
}

export interface RelationshipAst extends StatementAst {
  type: "relationship";
  left: ChainNodeAst;
  right: ChainNodeAst;
  arrow: string;
  kind?: string;
  label?: string;
}

export interface DirectiveAst extends StatementAst {
  type: "directive";
  name: string;
  value: string;
}

export type ScopeKind =
  | "account"
  | "region"
  | "vpc"
  | "subnet"
  | "cluster"
  | "namespace";

export interface ScopeAst extends StatementAst {
  type: "scope";
  kind: ScopeKind;
  name: string;
  statements: readonly StatementAst[];
  recovered?: boolean;
}

export interface InvalidStatementAst extends StatementAst {
  type: "invalid";
  raw: string;
  recovered: true;
  reason: string;
  partialRelationship?: {
    left?: ChainNodeAst;
    right?: ChainNodeAst;
    arrow: string;
  };
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
  accessibleName?: string;
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
  kind?: string;
  label?: string;
  span: SourceSpan;
}

export interface CloudScope {
  id: string;
  kind:
    | "account"
    | "region"
    | "vpc"
    | "subnet"
    | "cluster"
    | "namespace"
    | "group";
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
  accessibleName?: string;
  iconKey?: string;
  icon?: string;
  children?: readonly LayoutNode[];
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  points: readonly { x: number; y: number }[];
  arrow: string;
  kind?: string;
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

export type ValidationMode = "normal" | "strict" | "off";
export type ValidationPass = "structural" | "provider" | "guidance";
export type ThemeName = "light" | "dark";

export interface ResourceDefinition {
  id: string;
  displayName: string;
  category: string;
  aliases: readonly string[];
  searchTerms?: readonly string[];
  iconKey?: string;
  allowedContainment?: readonly string[];
}

export type RelationshipArea =
  | "connectivity"
  | "data"
  | "events"
  | "operations"
  | "processing"
  | "delivery"
  | "governance"
  | "lifecycle"
  | "dependency"
  | "reliability";

export interface RelationshipDefinition {
  kind: string;
  displayName: string;
  area?: RelationshipArea;
  /** Marks a provider-owned kind that is intentionally outside core metadata. */
  providerSpecific?: boolean;
  aliases?: readonly string[];
  searchTerms?: readonly string[];
  documentation?: string;
  allowedSources?: readonly string[];
  allowedTargets?: readonly string[];
}

export interface DirectiveDefinition {
  name: string;
  values: readonly string[];
  documentation: string;
  snippet: string;
}

export interface ScopeDefinition {
  kind: ScopeKind;
  documentation: string;
  snippet: string;
}

export interface OperatorDefinition {
  value: string;
  documentation: string;
}

export interface LanguageMetadata {
  directives: readonly DirectiveDefinition[];
  scopes: readonly ScopeDefinition[];
  operators: readonly OperatorDefinition[];
  relationships: readonly RelationshipDefinition[];
}

export interface CatalogResourceMetadata {
  id: string;
  displayName: string;
  category: string;
  aliases: readonly string[];
  searchTerms?: readonly string[];
  allowedContainment?: readonly string[];
}

export interface ProviderCatalogMetadata {
  id: string;
  name: string;
  catalogVersion: string;
  supportedScopes: readonly ScopeKind[];
  services: readonly CatalogResourceMetadata[];
  relationships: readonly RelationshipDefinition[];
}

export interface CatalogMetadata {
  directives: {
    provider: readonly string[];
    direction: readonly ("LR" | "RL" | "TB" | "BT")[];
    validation: readonly ValidationMode[];
    theme: readonly ThemeName[];
  };
  containmentScopes: readonly ScopeKind[];
  relationshipKinds: readonly string[];
  language: LanguageMetadata;
  providers: Record<string, ProviderCatalogMetadata>;
}

export interface SemanticRule {
  code: string;
  pass: ValidationPass;
  severity: "error" | "warning" | "info";
  summary: string;
  validate(graph: CloudGraph): readonly Diagnostic[];
}

export interface SanitizedIcon {
  key: string;
  checksum: string;
  svgFragment: string;
  viewBox: string;
}

export interface CatalogManifest {
  releaseId: string;
  retrievedAt: string;
  checksum: string;
  services: readonly ResourceDefinition[];
  icons: Record<string, SanitizedIcon>;
}

export interface CloudProvider {
  id: string;
  name: string;
  catalogVersion: string;
  supportedScopes?: readonly ScopeKind[];
  supports(serviceKind: string): boolean;
  resolveService(serviceKind: string): ServiceMetadata | undefined;
  listServices?(): readonly ResourceDefinition[];
  listRelationships?(): readonly RelationshipDefinition[];
  validateGraph(
    graph: CloudGraph,
    mode?: ValidationMode,
  ): readonly Diagnostic[];
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
    themeName?: ThemeName,
  ): SvgResult;
}

export class ArchLexAbortError extends Error {
  constructor(message = "Operation aborted") {
    super(message);
    this.name = "ArchLexAbortError";
  }
}

export class ArchLexInternalError extends Error {
  constructor(
    public stage: string,
    message: string,
    public cause?: unknown,
  ) {
    super(`[${stage}] Internal error: ${message}`);
    this.name = "ArchLexInternalError";
  }
}

export * from "./labels.js";
