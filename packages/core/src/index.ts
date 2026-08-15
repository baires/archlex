import { awsProvider } from "@archlex/aws";
import { createDiagnostic, diagnosticRegistry } from "@archlex/diagnostics";
import { gcpProvider } from "@archlex/gcp";
import type { IconRegistry, IconRequest } from "@archlex/icons-core";
import { k8sProvider } from "@archlex/k8s";
import { createInlineLayoutEngine } from "@archlex/layout-elk";
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
  ThemeName,
  ValidationMode,
} from "@archlex/model";
import { parse as parseSource } from "@archlex/parser";
import { createSvgRenderer } from "@archlex/renderer-svg";
import { applyIconRegistry, collectIconRequests } from "./icon-registry.js";

export interface ArchLexOptions {
  providers: readonly CloudProvider[];
  defaultProvider?: string;
  layoutEngine?: LayoutEngine;
  renderer?: GraphRenderer;
}

export interface AnalyzeOptions {
  validation?: ValidationMode;
  provider?: string;
}

export interface PrepareOptions extends AnalyzeOptions {}

export interface RenderPreparedOptions {
  direction?: LayoutOptions["direction"];
  theme?: ThemeName;
  signal?: AbortSignal;
  icons?: IconRegistry;
}

export interface RenderPipelineOptions extends RenderPreparedOptions {
  validation?: ValidationMode;
}

export interface PreparedDiagram {
  readonly ast: DocumentAst;
  readonly graph: CloudGraph;
  readonly diagnostics: readonly Diagnostic[];
  readonly iconRequests: readonly IconRequest[];
  readonly direction?: LayoutOptions["direction"];
  readonly theme?: ThemeName;
}

export const KNOWN_RELATIONSHIPS = [
  "connects",
  "reads",
  "writes",
  "publishes",
  "subscribes",
  "invokes",
  "routes",
  "replicates",
  "assumes-role",
  "encrypts",
  "decrypts",
  "monitors",
  "logs",
  "caches",
  "proxies",
  "traces",
  "alerts",
  "processes",
  "transforms",
  "orchestrates",
  "triggers",
  "schedules",
  "builds",
  "deploys",
  "analyzes",
  "transcodes",
  "packages",
  "migrates",
  "discovers",
  "catalogs",
  "protects",
  "governs",
] as const;

export interface CatalogMetadata {
  directives: {
    provider: readonly string[];
    direction: readonly ["LR", "RL", "TB", "BT"];
    validation: readonly ["strict", "normal", "off"];
    theme: readonly ["light", "dark"];
  };
  containmentScopes: readonly string[];
  relationshipKinds: readonly string[];
  providers: Record<
    string,
    {
      id: string;
      name: string;
      catalogVersion: string;
      services: readonly {
        id: string;
        displayName: string;
        category: string;
        aliases: readonly string[];
        allowedContainment?: readonly string[];
      }[];
    }
  >;
}

export interface ArchLex {
  parse(source: string): ParseResult;
  analyze(ast: DocumentAst, options?: AnalyzeOptions): AnalysisResult;
  layout(graph: CloudGraph, options?: LayoutOptions): Promise<LayoutResult>;
  renderGraph(
    graph: LayoutGraph,
    diagnostics?: readonly Diagnostic[],
    theme?: ThemeName,
  ): SvgResult;
  prepare(source: string, options?: PrepareOptions): PreparedDiagram;
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

function collectDirectives(
  statements: readonly StatementAst[],
  diagnostics: Diagnostic[],
): Partial<Record<"provider" | "direction" | "validation" | "theme", string>> {
  const values: Partial<
    Record<"provider" | "direction" | "validation" | "theme", string>
  > = {};
  let declarationsStarted = false;
  for (const statement of statements) {
    if (statement.type !== "directive") {
      declarationsStarted = true;
      continue;
    }
    const directive = statement as DirectiveAst;
    const name = directive.name as
      | "provider"
      | "direction"
      | "validation"
      | "theme";
    if (declarationsStarted || values[name] !== undefined) {
      diagnostics.push(
        createDiagnostic(
          declarationsStarted
            ? "AL-STRUCT-LATE-DIRECTIVE"
            : "AL-STRUCT-DUPLICATE-DIRECTIVE",
          { directiveName: name },
          directive.span,
          [],
          diagnosticRegistry,
        ),
      );
      continue;
    }
    const allowed =
      name === "direction"
        ? ["LR", "RL", "TB", "BT"]
        : name === "validation"
          ? ["normal", "strict", "off"]
          : name === "theme"
            ? ["light", "dark"]
            : undefined;
    if (allowed && !allowed.includes(directive.value)) {
      diagnostics.push(
        createDiagnostic(
          "AL-STRUCT-INVALID-DIRECTIVE",
          {
            directiveName: name,
            value: directive.value,
            allowedValues: allowed.join(", "),
          },
          directive.span,
          [],
          diagnosticRegistry,
        ),
      );
      continue;
    }
    values[name] = directive.value;
  }
  return values;
}

function getDirectionDirective(
  ast: DocumentAst,
): LayoutOptions["direction"] | undefined {
  let declarationsStarted = false;
  let direction: LayoutOptions["direction"] | undefined;

  for (const statement of ast.statements) {
    if (statement.type !== "directive") {
      declarationsStarted = true;
      continue;
    }
    const directive = statement as DirectiveAst;
    if (
      declarationsStarted ||
      direction !== undefined ||
      directive.name !== "direction"
    ) {
      continue;
    }
    if (["LR", "RL", "TB", "BT"].includes(directive.value)) {
      direction = directive.value as LayoutOptions["direction"];
    }
  }

  return direction;
}

function getThemeDirective(ast: DocumentAst): ThemeName | undefined {
  let declarationsStarted = false;
  let theme: ThemeName | undefined;

  for (const statement of ast.statements) {
    if (statement.type !== "directive") {
      declarationsStarted = true;
      continue;
    }
    const directive = statement as DirectiveAst;
    if (
      declarationsStarted ||
      theme !== undefined ||
      directive.name !== "theme"
    ) {
      continue;
    }
    if (["light", "dark"].includes(directive.value)) {
      theme = directive.value as ThemeName;
    }
  }

  return theme;
}

function getLegacyDirective(
  ast: DocumentAst,
  name: string,
): string | undefined {
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

function collectInjectedIconNodeIds(
  preparedGraph: CloudGraph,
  graph: CloudGraph,
): ReadonlySet<string> {
  const preparedNodes = new Map(
    preparedGraph.nodes.map((node) => [node.id, node]),
  );
  const ids = new Set<string>();

  for (const node of graph.nodes) {
    const preparedNode = preparedNodes.get(node.id);
    if (preparedNode && !preparedNode.icon && node.icon) ids.add(node.id);
  }

  return ids;
}

function applyInjectedIconsToLayout(
  layout: LayoutGraph,
  graph: CloudGraph,
  injectedIconNodeIds: ReadonlySet<string>,
): LayoutGraph {
  if (injectedIconNodeIds.size === 0) return layout;

  const graphNodes = new Map(graph.nodes.map((node) => [node.id, node]));

  const applyToNode = (
    node: LayoutGraph["nodes"][number],
  ): LayoutGraph["nodes"][number] => {
    const sourceNode = graphNodes.get(node.id);
    const children = node.children?.map(applyToNode);
    const childrenChanged = children?.some(
      (child, index) => child !== node.children?.[index],
    );
    const iconChanged =
      sourceNode !== undefined &&
      injectedIconNodeIds.has(node.id) &&
      node.icon !== sourceNode.icon;

    if (!childrenChanged && !iconChanged) return node;

    return {
      ...node,
      ...(children ? { children } : {}),
      ...(sourceNode && injectedIconNodeIds.has(node.id)
        ? { icon: sourceNode.icon }
        : {}),
    };
  };

  const nodes = layout.nodes.map(applyToNode);
  return nodes.some((node, index) => node !== layout.nodes[index])
    ? { ...layout, nodes }
    : layout;
}

export function createArchLex(options: ArchLexOptions): ArchLex {
  if (!options.providers || options.providers.length === 0) {
    throw new Error("createArchLex requires at least one provider.");
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
        // Tier 1: Core Infrastructure
        "encrypts",
        "decrypts",
        "monitors",
        "logs",
        "caches",
        "proxies",
        "traces",
        "alerts",
        // Tier 2: Application Services
        "processes",
        "transforms",
        "orchestrates",
        "triggers",
        "schedules",
        "builds",
        "deploys",
        "analyzes",
        // Tier 3: Specialized Services
        "transcodes",
        "packages",
        "migrates",
        "discovers",
        "catalogs",
        "protects",
        "governs",
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
          diagnostics.push(
            createDiagnostic(
              "AL-SEM-UNKNOWN-RESOURCE",
              {
                serviceKind,
                provider: qualifiedProvider ?? providerId,
              },
              span,
              [id],
              diagnosticRegistry,
            ),
          );
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
            diagnostics.push(
              createDiagnostic(
                "AL-STRUCT-CONFLICTING-LABEL",
                { id },
                span,
                [id],
                diagnosticRegistry,
              ),
            );
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
          diagnostics.push(
            createDiagnostic(
              "AL-STRUCT-DUPLICATE-ID",
              {
                id: local,
                line: resource.span.start.line,
                column: resource.span.start.column,
              },
              resource.span,
              [existing],
              diagnosticRegistry,
            ),
          );
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
            diagnostics.push(
              createDiagnostic(
                "AL-SEM-UNKNOWN-RELATIONSHIP",
                {
                  relationshipKind: rel.kind,
                  leftKind: rel.left.kind,
                  rightKind: rel.right.kind,
                },
                rel.span,
                [edgeId],
                diagnosticRegistry,
              ),
            );
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
        diagnostics.push(
          createDiagnostic(
            "AL-SEM-EMPTY-GRAPH",
            {},
            {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 1, offset: 0 },
            },
            [],
            diagnosticRegistry,
          ),
        );
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

    prepare(source: string, prepareOptions?: PrepareOptions): PreparedDiagram {
      const parseRes = this.parse(source);
      const analysisRes = this.analyze(parseRes.ast, prepareOptions);

      return {
        ast: parseRes.ast,
        graph: analysisRes.graph,
        diagnostics: [...parseRes.diagnostics, ...analysisRes.diagnostics],
        iconRequests: collectIconRequests(analysisRes.graph),
        direction: getDirectionDirective(parseRes.ast),
        theme: getThemeDirective(parseRes.ast),
      };
    },

    async renderPrepared(
      prepared: PreparedDiagram,
      renderOptions?: RenderPreparedOptions,
    ): Promise<RenderResult> {
      const graph = renderOptions?.icons
        ? applyIconRegistry(prepared.graph, renderOptions.icons)
        : prepared.graph;
      const injectedIconNodeIds = renderOptions?.icons
        ? collectInjectedIconNodeIds(prepared.graph, graph)
        : new Set<string>();
      const layoutRes = await this.layout(graph, {
        direction: renderOptions?.direction ?? prepared.direction,
        signal: renderOptions?.signal,
      });
      const combinedDiagnostics = [
        ...prepared.diagnostics,
        ...layoutRes.diagnostics,
      ];
      const layout = applyInjectedIconsToLayout(
        layoutRes.graph,
        graph,
        injectedIconNodeIds,
      );
      const svgRes = this.renderGraph(
        layout,
        combinedDiagnostics,
        renderOptions?.theme ?? prepared.theme,
      );

      return {
        ...svgRes,
        ast: prepared.ast,
        graph,
        layout,
      };
    },

    async render(
      source: string,
      renderOptions?: RenderPipelineOptions,
    ): Promise<RenderResult> {
      const prepared = this.prepare(source, {
        validation: renderOptions?.validation,
      });
      return this.renderPrepared(prepared, {
        direction: (renderOptions?.direction ??
          getLegacyDirective(
            prepared.ast,
            "direction",
          )) as LayoutOptions["direction"],
        theme: renderOptions?.theme,
        signal: renderOptions?.signal,
        icons: renderOptions?.icons,
      });
    },

    getCatalog(providerFilter?: string): CatalogMetadata {
      const providersObj: CatalogMetadata["providers"] = {};
      for (const [id, provider] of providerMap.entries()) {
        if (
          providerFilter &&
          providerFilter !== "all" &&
          id !== providerFilter
        ) {
          continue;
        }
        const services = provider.listServices ? provider.listServices() : [];
        providersObj[id] = {
          id: provider.id,
          name: provider.name,
          catalogVersion: provider.catalogVersion,
          services: services.map((s) => ({
            id: s.id,
            displayName: s.displayName,
            category: s.category,
            aliases: s.aliases,
            allowedContainment: s.allowedContainment,
          })),
        };
      }

      return {
        directives: {
          provider: Array.from(providerMap.keys()),
          direction: ["LR", "RL", "TB", "BT"],
          validation: ["strict", "normal", "off"],
          theme: ["light", "dark"],
        },
        containmentScopes: [
          "account",
          "region",
          "vpc",
          "subnet",
          "cluster",
          "namespace",
        ],
        relationshipKinds: KNOWN_RELATIONSHIPS,
        providers: providersObj,
      };
    },
  };
}

export { applyIconRegistry, collectIconRequests } from "./icon-registry.js";
export { awsProvider, gcpProvider, k8sProvider };
