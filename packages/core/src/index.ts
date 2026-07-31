import { awsProvider } from "@cloudmer/aws";
import { gcpProvider } from "@cloudmer/gcp";
import { createInlineLayoutEngine } from "@cloudmer/layout-elk";
import type {
  AnalysisResult,
  CloudEdge,
  CloudGraph,
  CloudNode,
  CloudProvider,
  Diagnostic,
  DirectiveAst,
  DocumentAst,
  GraphRenderer,
  InvalidStatementAst,
  LayoutEngine,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  ParseResult,
  RelationshipAst,
  RenderResult,
  ResourceAst,
  ScopeAst,
  StatementAst,
  SvgResult,
  ValidationMode,
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

export interface AnalyzeOptions {
  validation?: "normal" | "strict" | "off";
  provider?: string;
}

export interface CloudMer {
  parse(source: string): ParseResult;
  analyze(ast: DocumentAst, options?: AnalyzeOptions): AnalysisResult;
  layout(graph: CloudGraph, options?: LayoutOptions): Promise<LayoutResult>;
  renderGraph(
    graph: LayoutGraph,
    diagnostics?: readonly Diagnostic[],
    theme?: "light" | "dark",
  ): SvgResult;
  render(
    source: string,
    options?: RenderPipelineOptions,
  ): Promise<RenderResult>;
}

function collectDirectives(
  statements: readonly StatementAst[],
  diagnostics: Diagnostic[],
): Partial<Record<"provider" | "direction" | "validation", string>> {
  const values: Partial<
    Record<"provider" | "direction" | "validation", string>
  > = {};
  let declarationsStarted = false;
  for (const statement of statements) {
    if (statement.type !== "directive") {
      declarationsStarted = true;
      continue;
    }
    const directive = statement as DirectiveAst;
    const name = directive.name as "provider" | "direction" | "validation";
    if (declarationsStarted || values[name] !== undefined) {
      diagnostics.push({
        code: declarationsStarted
          ? "CM-STRUCT-LATE-DIRECTIVE"
          : "CM-STRUCT-DUPLICATE-DIRECTIVE",
        severity: "error",
        message: `${declarationsStarted ? "Late" : "Duplicate"} '${name}' directive is ignored.`,
        span: directive.span,
        elements: [],
      });
      continue;
    }
    const allowed =
      name === "direction"
        ? ["LR", "RL", "TB", "BT"]
        : name === "validation"
          ? ["normal", "strict", "off"]
          : undefined;
    if (allowed && !allowed.includes(directive.value)) {
      diagnostics.push({
        code: "CM-STRUCT-INVALID-DIRECTIVE",
        severity: "error",
        message: `Invalid value '${directive.value}' for '${name}'.`,
        span: directive.span,
        elements: [],
        remediation: `Use one of: ${allowed.join(", ")}.`,
      });
      continue;
    }
    values[name] = directive.value;
  }
  return values;
}

function getDirective(ast: DocumentAst, name: string): string | undefined {
  const directive = ast.statements.find(
    (statement) =>
      statement.type === "directive" &&
      "name" in statement &&
      statement.name === name,
  );
  return directive && "value" in directive
    ? (directive.value as string)
    : undefined;
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

    analyze(ast: DocumentAst, analyzeOptions?: AnalyzeOptions): AnalysisResult {
      const nodesMap = new Map<string, CloudNode>();
      const edges: CloudEdge[] = [];
      const scopes: CloudGraph["scopes"][number][] = [];
      const diagnostics: Diagnostic[] = [];
      const directives = collectDirectives(ast.statements, diagnostics);
      const providerId =
        analyzeOptions?.provider ?? directives.provider ?? defaultProvider;
      const provider = providerMap.get(providerId);
      const validation =
        analyzeOptions?.validation ?? directives.validation ?? "normal";
      const knownRelationships = new Set([
        "connects",
        "reads",
        "writes",
        "publishes",
        "subscribes",
        "invokes",
        "routes",
        "replicates",
        "assumes-role",
      ]);
      const globalNames = new Map<string, string[]>();

      const createNode = (
        id: string,
        kind: string,
        name: string | undefined,
        span: CloudNode["span"],
        displayLabel?: string,
      ): CloudNode => {
        const [qualifiedProvider, qualifiedKind] = kind.includes(".")
          ? kind.split(".", 2)
          : [providerId, kind];
        const nodeProvider = providerMap.get(qualifiedProvider ?? providerId);
        const serviceKind = qualifiedKind ?? kind;
        const service = nodeProvider?.resolveService(serviceKind);
        const label =
          displayLabel ?? name ?? service?.displayName ?? serviceKind;
        const node = {
          id,
          provider: qualifiedProvider ?? providerId,
          serviceKind: service?.id ?? serviceKind,
          name,
          label,
          accessibleName:
            service?.displayName && service.displayName !== label
              ? `${label} (${service.displayName})`
              : undefined,
          iconKey: service?.iconKey,
          icon: service?.iconSvg,
          span,
        };
        if (!service) {
          diagnostics.push({
            code: "CM-SEM-UNKNOWN-RESOURCE",
            severity: "info",
            message: `Unknown resource type '${kind}' is rendered generically.`,
            span,
            elements: [id],
          });
        }
        return node;
      };

      const nodeDisplayLabels = new Map<
        string,
        { value: string; span: CloudNode["span"] }
      >();
      const applyDisplayLabel = (
        id: string,
        displayLabel: string | undefined,
        span: CloudNode["span"],
      ) => {
        if (!displayLabel) return;
        const node = nodesMap.get(id);
        if (!node) return;
        const existing = nodeDisplayLabels.get(id);
        if (existing) {
          if (existing.value !== displayLabel) {
            diagnostics.push({
              code: "CM-STRUCT-CONFLICTING-LABEL",
              severity: "info",
              message: `Conflicting display label '${displayLabel}' is ignored; '${existing.value}' was applied first.`,
              span,
              related: [
                {
                  message: "First display label for this resource.",
                  span: existing.span,
                },
              ],
              elements: [id],
            });
          }
          return;
        }
        nodeDisplayLabels.set(id, { value: displayLabel, span });
        const serviceDisplayName = providerMap
          .get(node.provider)
          ?.resolveService(node.serviceKind)?.displayName;
        nodesMap.set(id, {
          ...node,
          label: displayLabel,
          accessibleName:
            serviceDisplayName && serviceDisplayName !== displayLabel
              ? `${displayLabel} (${serviceDisplayName})`
              : undefined,
        });
      };

      type Environment = {
        path: string;
        parent?: Environment;
        names: Map<string, string>;
      };
      const root: Environment = { path: "", names: new Map() };
      const makeId = (path: string, local: string) =>
        path ? `${path}/${local}` : local;
      const rememberGlobal = (name: string, id: string) => {
        const ids = globalNames.get(name) ?? [];
        ids.push(id);
        globalNames.set(name, ids);
      };
      const resolve = (name: string, env: Environment): string | undefined => {
        for (
          let current: Environment | undefined = env;
          current;
          current = current.parent
        ) {
          const id = current.names.get(name);
          if (id) return id;
        }
        const global = globalNames.get(name);
        return global?.length === 1 ? global[0] : undefined;
      };

      const declare = (resource: ResourceAst, env: Environment) => {
        const local = resource.name ?? resource.kind;
        const id = makeId(env.path, local);
        const existing = env.names.get(local);
        if (existing) {
          diagnostics.push({
            code: "CM-STRUCT-DUPLICATE-ID",
            severity: "error",
            message: `Duplicate resource ID '${local}'.`,
            span: resource.span,
            related: [
              {
                message: "First declaration owns this ID.",
                span: nodesMap.get(existing)?.span ?? resource.span,
              },
            ],
            elements: [existing],
          });
          return;
        }
        env.names.set(local, id);
        rememberGlobal(local, id);
        nodesMap.set(
          id,
          createNode(
            id,
            resource.kind,
            resource.name,
            resource.span,
            resource.displayLabel,
          ),
        );
        if (resource.displayLabel) {
          nodeDisplayLabels.set(id, {
            value: resource.displayLabel,
            span: resource.span,
          });
        }
      };

      const buildDeclarations = (
        statements: readonly StatementAst[],
        env: Environment,
      ) => {
        for (const statement of statements) {
          if (statement.type === "resource")
            declare(statement as ResourceAst, env);
          if (statement.type === "scope") {
            const scope = statement as ScopeAst;
            const scopeId = makeId(env.path, `${scope.kind}:${scope.name}`);
            const child: Environment = {
              path: scopeId,
              parent: env,
              names: new Map(),
            };
            buildDeclarations(scope.statements, child);
            scopes.push({
              id: scopeId,
              kind: scope.kind,
              name: scope.name,
              childrenNodeIds: Array.from(nodesMap.keys()).filter((id) =>
                id.startsWith(`${scopeId}/`),
              ),
            });
          }
        }
      };
      buildDeclarations(ast.statements, root);

      const processRelationships = (
        statements: readonly StatementAst[],
        env: Environment,
      ) => {
        for (const statement of statements) {
          if (statement.type === "scope") {
            const scope = statement as ScopeAst;
            const scopeId = makeId(env.path, `${scope.kind}:${scope.name}`);
            const child: Environment = {
              path: scopeId,
              parent: env,
              names: new Map(),
            };
            for (const nested of scope.statements) {
              if (nested.type === "resource") {
                const resource = nested as ResourceAst;
                child.names.set(
                  resource.name ?? resource.kind,
                  makeId(scopeId, resource.name ?? resource.kind),
                );
              }
            }
            processRelationships(scope.statements, child);
            continue;
          }
          if (statement.type === "invalid") {
            const invalid = statement as InvalidStatementAst;
            const partial = invalid.partialRelationship;
            const validEndpoint = partial?.left ?? partial?.right;
            if (!partial || !validEndpoint) continue;
            const validId =
              resolve(validEndpoint.kind, env) ??
              makeId(env.path, validEndpoint.kind);
            if (!nodesMap.has(validId)) {
              nodesMap.set(
                validId,
                createNode(
                  validId,
                  validEndpoint.kind,
                  undefined,
                  validEndpoint.span,
                  validEndpoint.displayLabel,
                ),
              );
              if (validEndpoint.displayLabel) {
                nodeDisplayLabels.set(validId, {
                  value: validEndpoint.displayLabel,
                  span: validEndpoint.span,
                });
              }
            } else {
              applyDisplayLabel(
                validId,
                validEndpoint.displayLabel,
                validEndpoint.span,
              );
            }
            const placeholderId = makeId(
              env.path,
              `__missing_endpoint_${edges.length + 1}`,
            );
            nodesMap.set(placeholderId, {
              id: placeholderId,
              provider: providerId,
              serviceKind: "unknown",
              label: "Missing endpoint",
              span: invalid.span,
            });
            const reverse = partial.arrow === "<-";
            let source = partial.left ? validId : placeholderId;
            let target = partial.left ? placeholderId : validId;
            if (reverse) [source, target] = [target, source];
            edges.push({
              id: `${source}-${partial.arrow}-${target}`,
              source,
              target,
              arrow: partial.arrow,
              span: invalid.span,
            });
            continue;
          }
          if (statement.type !== "relationship") continue;
          const rel = statement as RelationshipAst;
          const endpoint = (
            kind: string,
            span: CloudNode["span"],
            displayLabel?: string,
          ) => {
            const resolved = resolve(kind, env);
            if (resolved) {
              applyDisplayLabel(resolved, displayLabel, span);
              return resolved;
            }
            const id = makeId(env.path, kind);
            if (!nodesMap.has(id)) {
              env.names.set(kind, id);
              rememberGlobal(kind, id);
              nodesMap.set(
                id,
                createNode(id, kind, undefined, span, displayLabel),
              );
              if (displayLabel) {
                nodeDisplayLabels.set(id, { value: displayLabel, span });
              }
            } else {
              applyDisplayLabel(id, displayLabel, span);
            }
            return id;
          };
          let source = endpoint(
            rel.left.kind,
            rel.left.span,
            rel.left.displayLabel,
          );
          let target = endpoint(
            rel.right.kind,
            rel.right.span,
            rel.right.displayLabel,
          );
          if (rel.arrow === "<-") [source, target] = [target, source];
          const edgeId = `${source}-${rel.arrow}-${target}`;
          edges.push({
            id: edgeId,
            source,
            target,
            arrow: rel.arrow,
            kind: rel.kind,
            label: rel.label,
            span: rel.span,
          });
          if (rel.kind && !knownRelationships.has(rel.kind)) {
            diagnostics.push({
              code: "CM-SEM-UNKNOWN-RELATIONSHIP",
              severity: "info",
              message: `Unknown relationship kind '${rel.kind}' is preserved.`,
              span: rel.span,
              elements: [edgeId],
            });
          }
        }
      };
      processRelationships(ast.statements, root);

      const graph: CloudGraph = {
        nodes: Array.from(nodesMap.values()),
        edges,
        scopes: scopes.sort(
          (a, b) => a.id.split("/").length - b.id.split("/").length,
        ),
      };

      if (graph.nodes.length === 0) {
        diagnostics.push({
          code: "CM-SEM-EMPTY-GRAPH",
          severity: "info",
          message:
            "Document contains no resource or relationship declarations.",
          span: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          elements: [],
          remediation:
            "Add a resource (e.g., rds) or relationship (e.g., rds-proxy > rds > ecs).",
        });
      }

      if (provider && validation !== "off") {
        const providerDiagnostics = provider.validateGraph(
          graph,
          validation as ValidationMode,
        );
        diagnostics.push(...providerDiagnostics);
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
      theme?: "light" | "dark",
    ): SvgResult {
      return renderer.render(graph, diagnostics, theme);
    },

    async render(
      source: string,
      renderOptions?: RenderPipelineOptions,
    ): Promise<RenderResult> {
      const parseRes = this.parse(source);
      const analysisRes = this.analyze(parseRes.ast, {
        validation: renderOptions?.validation,
      });

      const layoutRes = await this.layout(analysisRes.graph, {
        direction: (renderOptions?.direction ??
          getDirective(
            parseRes.ast,
            "direction",
          )) as LayoutOptions["direction"],
        signal: renderOptions?.signal,
      });

      const combinedDiagnostics = [
        ...parseRes.diagnostics,
        ...analysisRes.diagnostics,
        ...layoutRes.diagnostics,
      ];

      const svgRes = this.renderGraph(
        layoutRes.graph,
        combinedDiagnostics,
        renderOptions?.theme,
      );

      return {
        ...svgRes,
        ast: parseRes.ast,
        graph: analysisRes.graph,
        layout: layoutRes.graph,
      };
    },
  };
}

export { awsProvider, gcpProvider };
