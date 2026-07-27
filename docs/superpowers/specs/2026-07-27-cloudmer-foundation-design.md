# CloudMer Foundation Design

## Summary

CloudMer is a browser-first TypeScript library for describing AWS architectures with a concise, provider-aware language and rendering them as accessible SVG diagrams. Its primary differentiator is semantic knowledge of cloud resources and relationships, not generic graph drawing.

The initial product is a reusable framework-neutral browser library plus a small React playground. It does not use Mermaid as its parser, layout engine, or renderer. Mermaid is prior art for separating parsing from rendering; CloudMer owns its language, semantic graph, diagnostics, layout adaptation, and SVG output.

## Goals

- Turn concise source such as `rds-proxy > rds > ecs` into an AWS architecture diagram.
- Support both implicit resources and explicitly named instances.
- Keep relationship direction independent from visual layout direction.
- Represent generic flows and machine-readable cloud relationship semantics.
- Treat accounts, regions, VPCs, and subnets as semantic containment boundaries.
- Return useful partial diagrams when syntax or semantic errors are present.
- Provide a stable browser API that does not depend on a UI framework.
- Establish provider and catalog interfaces that can support GCP after the AWS language and renderer stabilize.
- Grow toward semantically complete AWS coverage, beginning with a defined core service set.

## Non-goals for the First Milestone

- GCP resource support.
- A polished hosted editor product.
- User accounts, backend persistence, collaboration, cloud storage, or sharing links.
- PNG generation in the core renderer.
- Encoding every architectural property of every AWS service in the first release.
- Reusing Mermaid as the renderer.
- A Rust, C, or WebAssembly implementation.

## Technical Direction

The first implementation is TypeScript-native. Parsing performance is not expected to be the main source of complexity; semantic rules, recoverable diagnostics, compound layout, and deterministic rendering are more important. Clean stage interfaces allow a future Rust/Wasm parser or analyzer without changing public graph interfaces.

ELK.js supplies geometry only. Its layered layout supports directed graphs, ports, orthogonal routing, and compound graphs, which match cloud architecture needs. CloudMer remains responsible for semantics, icons, styles, accessibility, and SVG structure.

Official AWS architecture icons form a separately versioned catalog because AWS updates its icon packages independently. Provider assets must preserve their official visual treatment.

## Repository Architecture

The project is a TypeScript monorepo with the following packages:

### `@cloudmer/model`

Owns provider-neutral public types: AST nodes, source spans, graph nodes, groups, edges, diagnostics, layout results, provider interfaces, and renderer interfaces. Other packages may depend on `model`; `model` does not depend on them.

### `@cloudmer/parser`

Transforms source text into a recoverable AST and syntax diagnostics. It preserves source spans and partially recognized constructs. It has no AWS, ELK, SVG, React, or browser-DOM knowledge.

### `@cloudmer/aws`

Provides AWS resource definitions, aliases, official icon references, containment rules, relationship semantics, and validation rules through the provider-neutral interfaces in `model`. AWS assumptions do not enter the parser or renderer.

### `@cloudmer/layout-elk`

Adapts a semantic `CloudGraph` to ELK.js and converts ELK output into a positioned graph. It runs in a Web Worker by default and exposes the same interface when running inline for tests or constrained consumers.

### `@cloudmer/renderer-svg`

Transforms a positioned graph into deterministic, accessible SVG using standard DOM/SVG APIs. It has no Mermaid or React dependency and does not perform semantic validation.

### `@cloudmer/core`

Provides the stable orchestration API and combines parser, providers, layout, and renderer. It also exposes individual stages for editor tooling and advanced integrations.

### `apps/playground`

A React/Vite reference consumer that depends on `@cloudmer/core`. It demonstrates live editing, diagnostics, selection synchronization, themes, and SVG export without making React part of the library API.

## Public API

The primary browser API is asynchronous because layout normally runs in a worker:

```ts
const cloudmer = createCloudMer({
  providers: [awsProvider()],
});

const result = await cloudmer.render(source, {
  direction: "LR",
  validation: "normal",
  theme: "light",
});

container.replaceChildren(result.svg);
console.log(result.diagnostics);
```

Advanced consumers and the playground can invoke stages independently:

```ts
cloudmer.parse(source);
cloudmer.analyze(ast);
cloudmer.layout(graph);
cloudmer.renderGraph(layoutGraph);
```

Conceptually, the boundaries are:

```ts
parse(source): ParseResult<Ast>
analyze(ast, catalog): AnalysisResult<CloudGraph>
layout(graph, options): Promise<LayoutGraph>
render(layout, theme): SvgResult
```

No stage silently throws for expected user-source errors. Expected errors appear as diagnostics and partial results. Unexpected internal failures reject the operation with a typed internal error.

## Language Design

### Directives

Diagrams may declare a default provider, layout direction, and validation mode:

```cloudmer
provider aws
direction LR
validation normal
```

Supported directions are `LR`, `RL`, `TB`, and `BT`. Supported validation modes are `strict`, `normal`, and `off`. Parse and structural diagnostics are always active. `normal` preserves provider-defined severities, `strict` promotes provider warnings to errors, and `off` skips provider validation and architecture-guidance passes. Validation mode never changes parsing behavior.

### Resources and Identity

An unqualified service name resolves through the default provider and creates or references an implicit instance:

```cloudmer
rds-proxy > rds > ecs
```

Named instances allow multiple resources of the same type:

```cloudmer
primary: rds
replica: rds
workers: ecs
```

Repeated implicit names refer to the same resource within the current scope. Multiple instances of one service type require explicit instance names. Fully qualified service names such as `aws.rds` remain valid and prepare the language for future multi-cloud diagrams.

### Relationships

Relationship direction and layout direction are independent. The initial operators are:

```cloudmer
a -> b
a <- b
a <-> b
a -- b
a -.-> b
a -[writes]-> b
a ->|PostgreSQL/TLS| b
a -[writes]->|PostgreSQL/TLS| b
```

`>` is shorthand for `->`. Generic arrows express untyped data flow. A value in square brackets is a machine-readable relationship kind. A value between vertical bars is a presentation label. Typed relationships and labels may be combined.

The initial provider-neutral relationship vocabulary is:

- `connects`
- `reads`
- `writes`
- `publishes`
- `subscribes`
- `invokes`
- `routes`
- `replicates`
- `assumes-role`

Unknown custom relationship types are preserved and rendered. They produce an informational diagnostic when no provider rule can evaluate them.

### Semantic Containment

The first AWS containment constructs are `account`, `region`, `vpc`, and `subnet`:

```cloudmer
provider aws
direction LR

account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        proxy: rds-proxy
        database: rds
        api: ecs
      }
    }
  }
}

api -[connects]-> proxy
proxy -[connects]-> database
```

Containment blocks are not decorative groups. They contribute deployment context to semantic validation and become compound graph nodes for layout and rendering.

## Intermediate Graph

The analyzer produces a provider-independent graph. A representative edge is:

```ts
interface GraphEdge {
  source: NodeId;
  target: NodeId;
  direction: "forward" | "backward" | "both" | "none";
  kind: RelationshipKind | CustomRelationship;
  label?: string;
  style: "solid" | "dotted";
  sourceSpan: SourceSpan;
  validity: "valid" | "warning" | "invalid" | "unknown";
}
```

The graph retains diagnostics and source mappings for nodes, groups, and edges. Provider analysis enriches the graph but does not mutate the parser AST. Re-analysis of the same AST and catalog version must be deterministic.

## AWS Semantic Model

Semantics are the central product capability. Provider definitions describe:

- Canonical resource type and aliases.
- Icon and display metadata.
- Allowed and required containment contexts.
- Relationships a resource may emit or accept.
- Cross-resource constraints.
- Diagnostic rules and remediation text.

The first milestone provides rich rules for:

- Account, region, VPC, subnet, route table, and security group.
- Application Load Balancer and Network Load Balancer.
- API Gateway, Lambda, ECS, EKS, and EC2.
- RDS, RDS Proxy, DynamoDB, and ElastiCache.
- S3, SQS, SNS, and EventBridge.
- IAM roles.
- CloudFront and Route 53.

The catalog infrastructure must support all official AWS icon entries as it grows. Semantic coverage expands continuously. A resource or relationship without a completed semantic rule is still preserved and rendered with an informational diagnostic rather than rejected.

## Diagnostics and Partial Results

Validation runs in three passes:

1. Structural validation: duplicate IDs, unresolved references, invalid nesting, and malformed relationships.
2. Provider validation: AWS containment and resource-relationship compatibility.
3. Architecture guidance: suspicious, incomplete, or not-yet-modeled configurations.

Each diagnostic contains a stable code, severity, message, primary source span, optional related spans, and related graph element IDs. For example:

```ts
{
  code: "AWS-RDS-PROXY-NETWORK-001",
  severity: "error",
  message: "RDS Proxy and its target must have compatible VPC placement.",
  span: { start: 184, end: 211 },
  elements: ["proxy", "database"]
}
```

The severity levels are:

- `error`: structurally invalid or known to be impossible.
- `warning`: likely incorrect or incomplete architecture.
- `info`: unknown semantics, missing catalog coverage, or non-blocking guidance.

The renderer receives partial valid graphs. Invalid edges use a red dashed treatment and marker; invalid nodes receive a highlighted border; warnings receive a restrained amber marker. Unknown semantic relationships render normally. Hover and keyboard focus expose associated diagnostics.

## Layout

ELK layered layout is the default. Direction directives map to ELK direction options. Semantic containment groups map to compound nodes. Resource connection points map to ports, and the default edge routing is orthogonal.

Relationship direction controls arrowheads. Layout direction controls placement only. The adapter must not infer semantic meaning from geometry.

The layout adapter caches results using a stable fingerprint of geometry-relevant graph data and options. It must not include irrelevant diagnostic message text in the fingerprint. The production browser path runs ELK in a Web Worker so editing remains responsive.

## SVG Rendering

The renderer creates SVG with deterministic element ordering and stable identifiers. Nodes and edges expose `data-*` attributes containing graph IDs and diagnostic IDs so editor consumers can correlate the diagram with source ranges.

The SVG includes an accessible title and description, textual node labels, navigable interactive elements, and visible focus states. Themes control the canvas, containers, text, edge treatments, diagnostic colors, spacing, and typography. Themes do not recolor official provider assets in ways that conflict with their usage guidance.

SVG is the only core output in the first milestone. The playground may later rasterize it through browser canvas for PNG export without changing the core renderer.

## Playground

The playground is a small React/Vite application with:

- Monaco source editor and CloudMer syntax highlighting.
- Debounced parse, analysis, layout, and render cycles.
- Live SVG preview.
- Source-to-SVG and SVG-to-source selection synchronization.
- Inline diagnostics and a navigable diagnostics panel.
- Layout-direction and validation-mode controls.
- Light and dark themes.
- Copy SVG and download SVG actions.
- Bundled valid and invalid AWS examples.
- Browser-local source persistence.

The playground uses only public `@cloudmer/core` behavior. It must not import internal parser, provider, layout, or renderer modules.

## Testing Strategy

### Parser

- Grammar fixture tests for accepted and rejected syntax.
- Recovery tests proving useful AST output after malformed input.
- Exact source-span assertions.
- Property tests that arbitrary input does not crash or hang.

### Semantic Engine and AWS Provider

- Table-driven tests for every declared resource and relationship rule.
- Valid, invalid, warning, and unknown-semantic cases.
- Nested containment and cross-boundary relationship cases.
- Stable diagnostic code and source-mapping assertions.

### Catalog

- Catalog-schema validation.
- Canonical identifier and alias-collision checks.
- Missing and orphaned icon checks.
- Deterministic generated-data snapshots.

### Layout

- Invariants for containment, graph direction, port assignment, and non-overlap.
- Worker and inline adapter parity.
- Stable graph-fingerprint tests.
- Minimal use of exact pixel snapshots to avoid coupling tests to ELK implementation details.

### Renderer

- Deterministic SVG snapshots for representative graphs.
- Accessibility checks.
- DOM tests for stable IDs, data attributes, focus, and diagnostic interaction.

### Core and Playground

- End-to-end source-to-SVG fixtures.
- Browser tests for live editing, partial rendering, correlated diagnostics, selection synchronization, theme changes, and SVG export.

## First-Milestone Acceptance Criteria

1. `rds-proxy > rds > ecs` renders as a deterministic left-to-right AWS diagram using official service imagery.
2. Explicitly named resources and nested account, region, VPC, and subnet boundaries render correctly.
3. Generic, typed, bidirectional, undirected, dotted, and labeled edges parse and render with direction independent from layout.
4. At least one invalid AWS relationship or placement produces a stable diagnostic, highlights the source and corresponding SVG element, and preserves a useful partial diagram.
5. The defined core AWS resource set has catalog entries and an initial meaningful suite of semantic rules.
6. ELK runs in a Web Worker in the playground without blocking normal editing.
7. The framework-neutral library is consumable independently from the React playground.
8. The test suites described above run in continuous integration.

## Research Basis

- Mermaid's extension guidance separates grammar/parsing from rendering: <https://mermaid.js.org/community/new-diagram>
- Mermaid architecture diagrams demonstrate services, groups, edges, and registered icon packs, while leaving room for CloudMer's more concise and semantic language: <https://mermaid.js.org/syntax/architecture>
- ELK layered layout supports directed layered placement, ports, orthogonal routing, compound graphs, and cross-hierarchy edges: <https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html>
- ELK.js exposes ELK layout to JavaScript and supports Web Workers: <https://github.com/kieler/elkjs>
- AWS publishes approved architecture assets and describes their update cadence: <https://aws.amazon.com/architecture/icons/>
- Google Cloud maintains an official product-icon library for the later provider milestone: <https://cloud.google.com/icons>

## Future Evolution

- Expand AWS resource and rule coverage toward semantic completeness.
- Generate more of the service catalog from curated upstream metadata while retaining reviewed semantic rules.
- Add GCP as a separate provider package after AWS syntax, graph interfaces, layout, and rendering stabilize.
- Add an optional Rust/Wasm parser or analyzer only if measured browser or CLI requirements justify it.
- Add PNG/PDF export adapters, CLI tooling, Markdown integrations, and language-server features as separate consumers of the stable core pipeline.
