# Monaco Language Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the playground's hard-coded Monaco completion lists and line regexes with catalog-driven, context-aware ArchLex language intelligence that searches human nomenclature and inserts canonical syntax.

**Architecture:** Move the public catalog metadata contract into `@archlex/model`, enrich it with language and provider semantics, and add a DOM-neutral `@archlex/language-service` package. The language service parses incomplete source into a cached document model and returns editor-neutral completion results; the playground keeps a thin Monaco adapter that converts ranges and kinds without owning ArchLex vocabulary.

**Tech Stack:** TypeScript strict mode, Chevrotain lexer/parser, Vitest, Monaco Editor 0.56, React 19, Playwright, pnpm workspaces, Turborepo, Biome.

## Global Constraints

- Node.js must remain `>=22.0.0`; pnpm must remain `>=9.0.0`.
- Do not use `any`.
- `@archlex/core` and `@archlex/language-service` must remain DOM-neutral and work in browser and Node.js environments.
- The playground completion implementation must not contain provider IDs, service IDs, aliases, display names, scope names, directive values, or relationship kinds.
- Catalog aliases remain valid DSL syntax; discovery-only `searchTerms` must never become accepted syntax or insertion text.
- Completion must insert canonical resource IDs under the approved provider-qualification rules.
- Completion must perform no network, rendering, layout, icon, storage, or React state work.
- Context and recovery must use lexer tokens plus the recoverable AST, not line-based grammar regexes.
- Incomplete or invalid source must not throw through Monaco's completion callback.
- Completion ranking must be deterministic.
- The warm language-service completion p95 must stay below 20 ms on the reference fixture; the Monaco callback p95 must stay below 50 ms in the browser fixture.
- Update product documentation and add changesets for published package changes.

---

## File Structure

### Shared contracts and metadata

- `packages/model/src/index.ts`: own catalog, language metadata, relationship metadata, scope, and provider capability types.
- `packages/core/src/language-metadata.ts`: own the canonical directive, scope, operator, and built-in relationship registry.
- `packages/core/src/language-metadata.test.ts`: prove registry uniqueness and compatibility exports.
- `packages/core/src/index.ts`: consume the registry, re-export model types, and build the complete catalog introspection result.
- `packages/core/src/index.test.ts`: verify the public catalog contract and remove duplicate relationship lists.

### Provider metadata and validation

- `packages/{aws,gcp,k8s}/src/builder.ts`: accept and preserve resource search terms.
- `packages/{aws,gcp,k8s}/src/catalog/index.ts`: add discovery-only nomenclature to high-value entries.
- `packages/{aws,gcp,k8s}/src/relationships.ts`: define provider relationship constraints where the provider has clear semantics.
- `packages/{aws,gcp,k8s}/src/index.ts`: expose supported scopes and relationship definitions through `CloudProvider`.
- `packages/diagnostics/src/catalog-validator.ts`: validate normalized aliases and search terms.
- `packages/diagnostics/src/relationship-validator.ts`: validate provider relationship references.
- `packages/diagnostics/src/catalog-validator.test.ts`: cover new validation rules.
- `scripts/validate-catalog.mjs`: include relationship validation in the repository catalog report.

### Editor-neutral language service

- `packages/language-service/package.json`, `tsconfig.json`, `vite.config.ts`, `README.md`, `LICENSE`: publish and build the new package.
- `packages/language-service/src/types.ts`: define editor-neutral document, symbol, context, index, and completion types.
- `packages/language-service/src/document.ts`: tokenize, parse, collect directives/scopes/symbols, and recover incomplete documents.
- `packages/language-service/src/context.ts`: classify a cursor offset from tokens and AST structure.
- `packages/language-service/src/catalog-index.ts`: normalize and index catalog search data once.
- `packages/language-service/src/matching.ts`: score canonical, alias, display-name, search-term, and fuzzy matches.
- `packages/language-service/src/completions.ts`: generate, qualify, deduplicate, and rank completions.
- `packages/language-service/src/index.ts`: export the public API.
- `packages/language-service/src/*.test.ts`: test each unit through its public or focused internal interface.

### Playground integration

- `apps/playground/package.json`: depend on `@archlex/language-service`.
- `apps/playground/src/App.tsx`: create catalog metadata once and pass it to the editor.
- `apps/playground/src/components/Editor.tsx`: accept catalog metadata and own completion-provider disposal.
- `apps/playground/src/monaco/archlex-language.ts`: build Monarch keyword/value sets from catalog metadata.
- `apps/playground/src/monaco/hover.ts`: build keyword, provider, service, and relationship help from catalog metadata.
- `apps/playground/src/monaco/completions.ts`: replace vocabulary and regexes with the language-service adapter.
- `apps/playground/src/monaco/archlex-language.test.ts`: prove catalog-driven token vocabulary.
- `apps/playground/src/monaco/hover.test.ts`: prove catalog-driven hover documentation.
- `apps/playground/src/monaco/completions.test.ts`: test range/kind conversion, caching, and failure containment.
- `tests/browser/monaco-completions.spec.mjs`: verify keyboard completion and performance in the real widget.

### Docs and release metadata

- `docs/specs/public-api.md`, `docs/specs/language.md`, `docs/specs/playground.md`: document contracts and behavior.
- `docs/specs/{aws,gcp,k8s}-semantics.md`: explain aliases versus search terms and relationship metadata.
- `.changeset/monaco-language-intelligence.md`: version all changed published packages.
- `pnpm-lock.yaml`: capture the new workspace dependency edges.

---

### Task 1: Define the shared language and catalog metadata contract

**Files:**
- Modify: `packages/model/src/index.ts:29-65,204-260`
- Create: `packages/core/src/language-metadata.ts`
- Create: `packages/core/src/language-metadata.test.ts`
- Modify: `packages/core/src/index.ts:1-150,342-380,859-908`
- Modify: `packages/core/src/index.test.ts`

**Interfaces:**
- Produces: `ScopeKind`, `DirectiveDefinition`, `ScopeDefinition`, `OperatorDefinition`, `RelationshipDefinition`, `LanguageMetadata`, `CatalogResourceMetadata`, `ProviderCatalogMetadata`, and `CatalogMetadata` from `@archlex/model`.
- Produces: `ARCHLEX_LANGUAGE_METADATA: LanguageMetadata` and compatibility export `KNOWN_RELATIONSHIPS` from `@archlex/core`.
- Produces: `CloudProvider.supportedScopes?: readonly ScopeKind[]` and `CloudProvider.listRelationships?(): readonly RelationshipDefinition[]`.
- Consumes: existing `ResourceDefinition`, `CloudProvider`, and `ArchLex.getCatalog()` contracts.

- [ ] **Step 1: Write failing model and core contract tests**

Add a `getCatalog()` test to `packages/core/src/index.test.ts`:

```ts
describe("catalog language metadata", () => {
  it("returns structured grammar and provider metadata", () => {
    const archlex = createArchLex({
      providers: [awsProvider(), gcpProvider(), k8sProvider()],
    });

    const catalog = archlex.getCatalog();

    expect(catalog.language.directives.map((item) => item.name)).toEqual([
      "provider",
      "direction",
      "validation",
      "theme",
    ]);
    expect(catalog.language.scopes.map((item) => item.kind)).toEqual([
      "account",
      "region",
      "vpc",
      "subnet",
      "cluster",
      "namespace",
    ]);
    expect(catalog.language.relationships).toContainEqual(
      expect.objectContaining({ kind: "connects" }),
    );
    expect(catalog.providers.aws.supportedScopes).toEqual([
      "account",
      "region",
      "vpc",
      "subnet",
    ]);
  });
});
```

Create `packages/core/src/language-metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ARCHLEX_LANGUAGE_METADATA, KNOWN_RELATIONSHIPS } from "./language-metadata.js";

describe("ARCHLEX_LANGUAGE_METADATA", () => {
  it("has unique directive, scope, operator, and relationship identifiers", () => {
    for (const values of [
      ARCHLEX_LANGUAGE_METADATA.directives.map(({ name }) => name),
      ARCHLEX_LANGUAGE_METADATA.scopes.map(({ kind }) => kind),
      ARCHLEX_LANGUAGE_METADATA.operators.map(({ value }) => value),
      ARCHLEX_LANGUAGE_METADATA.relationships.map(({ kind }) => kind),
    ]) {
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("derives the compatibility relationship list from definitions", () => {
    expect(KNOWN_RELATIONSHIPS).toEqual(
      ARCHLEX_LANGUAGE_METADATA.relationships.map(({ kind }) => kind),
    );
  });
});
```

- [ ] **Step 2: Run the tests and confirm the contract is missing**

Run:

```bash
pnpm --filter @archlex/core test -- --run src/language-metadata.test.ts src/index.test.ts
```

Expected: FAIL because `language-metadata.ts`, `catalog.language`, and `supportedScopes` do not exist.

- [ ] **Step 3: Add the shared types to `@archlex/model`**

Introduce and reuse `ScopeKind`:

```ts
export type ScopeKind =
  | "account"
  | "region"
  | "vpc"
  | "subnet"
  | "cluster"
  | "namespace";

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

export interface RelationshipDefinition {
  kind: string;
  displayName: string;
  aliases?: readonly string[];
  searchTerms?: readonly string[];
  documentation?: string;
  allowedSources?: readonly string[];
  allowedTargets?: readonly string[];
}

export interface LanguageMetadata {
  directives: readonly DirectiveDefinition[];
  scopes: readonly ScopeDefinition[];
  operators: readonly OperatorDefinition[];
  relationships: readonly RelationshipDefinition[];
}
```

Extend `ResourceDefinition`, `CloudProvider`, and move `CatalogMetadata` from core:

```ts
export interface ResourceDefinition {
  id: string;
  displayName: string;
  category: string;
  aliases: readonly string[];
  searchTerms?: readonly string[];
  iconKey?: string;
  allowedContainment?: readonly string[];
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
    direction: readonly ["LR", "RL", "TB", "BT"];
    validation: readonly ["strict", "normal", "off"];
    theme: readonly ["light", "dark"];
  };
  containmentScopes: readonly ScopeKind[];
  relationshipKinds: readonly string[];
  language: LanguageMetadata;
  providers: Record<string, ProviderCatalogMetadata>;
}
```

Add to `CloudProvider`:

```ts
supportedScopes?: readonly ScopeKind[];
listRelationships?(): readonly RelationshipDefinition[];
```

Replace the inline scope union in `ScopeAst` with `ScopeKind`.

- [ ] **Step 4: Create the canonical language registry**

Create `packages/core/src/language-metadata.ts`. Move the existing relationship
kinds from `index.ts` into `RelationshipDefinition` objects, and define all
current grammar data once:

```ts
import type { LanguageMetadata } from "@archlex/model";

export const ARCHLEX_LANGUAGE_METADATA = {
  directives: [
    {
      name: "provider",
      values: [],
      documentation: "Select the default provider for unqualified resources.",
      snippet: "provider ${1}",
    },
    {
      name: "direction",
      values: ["LR", "RL", "TB", "BT"],
      documentation: "Set the graph layout direction.",
      snippet: "direction ${1|LR,RL,TB,BT|}",
    },
    {
      name: "validation",
      values: ["normal", "strict", "off"],
      documentation: "Set semantic validation behavior.",
      snippet: "validation ${1|normal,strict,off|}",
    },
    {
      name: "theme",
      values: ["light", "dark"],
      documentation: "Set the rendered diagram theme.",
      snippet: "theme ${1|light,dark|}",
    },
  ],
  scopes: [
    { kind: "account", documentation: "Cloud account or organization scope.", snippet: "account ${1:name} {\n  $0\n}" },
    { kind: "region", documentation: "Cloud region scope.", snippet: "region ${1:name} {\n  $0\n}" },
    { kind: "vpc", documentation: "Virtual network scope.", snippet: "vpc ${1:name} {\n  $0\n}" },
    { kind: "subnet", documentation: "Network subnet scope.", snippet: "subnet ${1:name} {\n  $0\n}" },
    { kind: "cluster", documentation: "Kubernetes cluster scope.", snippet: "cluster ${1:name} {\n  $0\n}" },
    { kind: "namespace", documentation: "Kubernetes namespace scope.", snippet: "namespace ${1:name} {\n  $0\n}" },
  ],
  operators: [
    { value: "->", documentation: "Directed relationship." },
    { value: "<-", documentation: "Reverse directed relationship." },
    { value: "<->", documentation: "Bidirectional relationship." },
    { value: "--", documentation: "Undirected relationship." },
    { value: "-.->", documentation: "Dotted directed relationship." },
    { value: ">", documentation: "Short form of ->." },
  ],
  relationships: [
    { kind: "connects", displayName: "Connects", documentation: "Generic network or logical connection." },
    { kind: "reads", displayName: "Reads", documentation: "Reads data from the target." },
    { kind: "writes", displayName: "Writes", documentation: "Writes data to the target." },
    { kind: "publishes", displayName: "Publishes", documentation: "Publishes messages or events to the target." },
    { kind: "subscribes", displayName: "Subscribes", documentation: "Subscribes to messages or events from the target." },
    { kind: "invokes", displayName: "Invokes", documentation: "Invokes the target operation or service." },
    { kind: "routes", displayName: "Routes", documentation: "Routes traffic or work to the target." },
    { kind: "replicates", displayName: "Replicates", documentation: "Replicates state or data to the target." },
    { kind: "assumes-role", displayName: "Assumes role", documentation: "Assumes the target identity role." },
    { kind: "encrypts", displayName: "Encrypts", documentation: "Encrypts data with the target." },
    { kind: "decrypts", displayName: "Decrypts", documentation: "Decrypts data with the target." },
    { kind: "monitors", displayName: "Monitors", documentation: "Monitors the target resource or signal." },
    { kind: "logs", displayName: "Logs", documentation: "Sends logs to the target." },
    { kind: "caches", displayName: "Caches", documentation: "Caches target data or responses." },
    { kind: "proxies", displayName: "Proxies", documentation: "Proxies requests to the target." },
    { kind: "traces", displayName: "Traces", documentation: "Sends traces to the target." },
    { kind: "alerts", displayName: "Alerts", documentation: "Sends alerts to the target." },
    { kind: "processes", displayName: "Processes", documentation: "Processes work received from the target." },
    { kind: "transforms", displayName: "Transforms", documentation: "Transforms target data or events." },
    { kind: "orchestrates", displayName: "Orchestrates", documentation: "Coordinates the target workflow or service." },
    { kind: "triggers", displayName: "Triggers", documentation: "Triggers the target action or workflow." },
    { kind: "schedules", displayName: "Schedules", documentation: "Schedules work on the target." },
    { kind: "builds", displayName: "Builds", documentation: "Builds the target artifact or workload." },
    { kind: "deploys", displayName: "Deploys", documentation: "Deploys to the target environment or service." },
    { kind: "analyzes", displayName: "Analyzes", documentation: "Analyzes data from the target." },
    { kind: "transcodes", displayName: "Transcodes", documentation: "Transcodes target media." },
    { kind: "packages", displayName: "Packages", documentation: "Packages the target artifact." },
    { kind: "migrates", displayName: "Migrates", documentation: "Migrates data or workloads to the target." },
    { kind: "discovers", displayName: "Discovers", documentation: "Discovers target resources or metadata." },
    { kind: "catalogs", displayName: "Catalogs", documentation: "Catalogs target data or resources." },
    { kind: "protects", displayName: "Protects", documentation: "Applies protection to the target." },
    { kind: "governs", displayName: "Governs", documentation: "Applies governance to the target." },
  ],
} as const satisfies LanguageMetadata;

export const KNOWN_RELATIONSHIPS = ARCHLEX_LANGUAGE_METADATA.relationships.map(
  ({ kind }) => kind,
);
```

Do not retain another relationship-kind array in `index.ts`. Replace the local
`knownRelationships` literal with `new Set(KNOWN_RELATIONSHIPS)`.

- [ ] **Step 5: Build the complete catalog result in core**

Import `CatalogMetadata` from model, re-export `ARCHLEX_LANGUAGE_METADATA`, and
return both compatibility fields and structured metadata:

```ts
const language = {
  ...ARCHLEX_LANGUAGE_METADATA,
  directives: ARCHLEX_LANGUAGE_METADATA.directives.map((directive) =>
    directive.name === "provider"
      ? { ...directive, values: Array.from(providerMap.keys()) }
      : directive,
  ),
};

providersObj[id] = {
  id: provider.id,
  name: provider.name,
  catalogVersion: provider.catalogVersion,
  supportedScopes: provider.supportedScopes ?? [],
  services: services.map((service) => ({
    id: service.id,
    displayName: service.displayName,
    category: service.category,
    aliases: service.aliases,
    searchTerms: service.searchTerms,
    allowedContainment: service.allowedContainment,
  })),
  relationships: provider.listRelationships?.() ?? [],
};
```

Derive `directives`, `containmentScopes`, and `relationshipKinds` from
`language`; do not write a second vocabulary list.

- [ ] **Step 6: Run contract tests and package checks**

Run:

```bash
pnpm --filter @archlex/model build
pnpm --filter @archlex/core test
pnpm exec tsc -p packages/core/tsconfig.json --noEmit
```

Expected: all commands PASS.

- [ ] **Step 7: Commit the shared contract**

```bash
git add packages/model/src/index.ts packages/core/src/language-metadata.ts packages/core/src/language-metadata.test.ts packages/core/src/index.ts packages/core/src/index.test.ts
git commit -m "feat(core): expose language metadata"
```

---

### Task 2: Enrich provider catalogs and validation

**Files:**
- Modify: `packages/aws/src/builder.ts`
- Modify: `packages/gcp/src/builder.ts`
- Modify: `packages/k8s/src/builder.ts`
- Modify: `packages/aws/src/catalog/index.ts`
- Modify: `packages/gcp/src/catalog/index.ts`
- Modify: `packages/k8s/src/catalog/index.ts`
- Create: `packages/aws/src/relationships.ts`
- Create: `packages/gcp/src/relationships.ts`
- Create: `packages/k8s/src/relationships.ts`
- Modify: `packages/{aws,gcp,k8s}/src/index.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/index.test.ts`
- Modify: `packages/diagnostics/src/catalog-validator.ts`
- Modify: `packages/diagnostics/src/relationship-validator.ts`
- Modify: `packages/diagnostics/src/catalog-validator.test.ts`
- Modify: `scripts/validate-catalog.mjs`

**Interfaces:**
- Consumes: `ResourceDefinition.searchTerms`, `CloudProvider.supportedScopes`, and `CloudProvider.listRelationships()` from Task 1.
- Produces: provider-owned discovery terms, supported scopes, and relationship constraints in `getCatalog()`.
- Produces: `validateRelationshipDefinitions(services, relationships): readonly Diagnostic[]` from `@archlex/diagnostics`.

- [ ] **Step 1: Write failing validation tests**

Add these cases to `packages/diagnostics/src/catalog-validator.test.ts`:

```ts
test("normalizes aliases before conflict detection", () => {
  const result = validateCatalogManifest([
    { id: "first", displayName: "First", category: "compute", aliases: ["AWS.EKS"] },
    { id: "second", displayName: "Second", category: "compute", aliases: ["aws.eks"] },
  ]);
  expect(result.valid).toBe(false);
  expect(result.diagnostics[0]?.message).toContain("aws.eks");
});

test("rejects an alias that conflicts with another canonical ID", () => {
  const result = validateCatalogManifest([
    { id: "first", displayName: "First", category: "compute", aliases: ["second"] },
    { id: "second", displayName: "Second", category: "compute", aliases: [] },
  ]);
  expect(result.valid).toBe(false);
  expect(result.diagnostics[0]?.message).toContain("second");
});

test("rejects duplicate normalized search terms on one resource", () => {
  const result = validateCatalogManifest([
    {
      id: "eks",
      displayName: "Amazon EKS",
      category: "compute",
      aliases: [],
      searchTerms: ["Elastic Kubernetes Service", "elastic-kubernetes_service"],
    },
  ]);
  expect(result.valid).toBe(false);
});

test("allows one discovery term on different resources", () => {
  const result = validateCatalogManifest([
    { id: "rds", displayName: "Amazon RDS", category: "database", aliases: [], searchTerms: ["database"] },
    { id: "dynamodb", displayName: "Amazon DynamoDB", category: "database", aliases: [], searchTerms: ["database"] },
  ]);
  expect(result.valid).toBe(true);
});
```

Add relationship-validation tests beside the containment tests:

```ts
test("rejects relationship constraints that reference unknown services", () => {
  const diagnostics = validateRelationshipDefinitions(
    [{ id: "service", displayName: "Service", category: "networking", aliases: [] }],
    [{ kind: "targets", displayName: "Targets", allowedTargets: ["deployment"] }],
  );
  expect(diagnostics).toEqual([
    expect.objectContaining({ severity: "error", elements: ["targets", "deployment"] }),
  ]);
});
```

- [ ] **Step 2: Run diagnostics tests and confirm failure**

```bash
pnpm --filter @archlex/diagnostics test -- --run src/catalog-validator.test.ts
```

Expected: FAIL because normalized search validation and
`validateRelationshipDefinitions` do not exist.

- [ ] **Step 3: Implement normalized catalog and relationship validation**

In `catalog-validator.ts`, use one normalization function for aliases and search
terms:

```ts
function normalizeDiscoveryTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[._\s-]+/g, " ");
}
```

Collect normalized canonical IDs before checking aliases. Reject empty
aliases/search terms, aliases that conflict with another resource's canonical
ID, alias conflicts across resources, and duplicate normalized aliases or search
terms within one resource. Permit a search term to occur on different resources.

In `relationship-validator.ts`, add:

```ts
export function validateRelationshipDefinitions(
  services: Map<string, ResourceDefinition> | readonly ResourceDefinition[],
  relationships: readonly RelationshipDefinition[],
): readonly Diagnostic[];
```

Validate unique relationship kinds and verify each `allowedSources` and
`allowedTargets` ID against the provider's canonical service IDs.

- [ ] **Step 4: Preserve `searchTerms` in each provider builder**

Add `searchTerms?: string[]` to each `ServiceDefinitionInput`. Keep
`defineService()` unchanged apart from preserving the new property through the
existing object spread.

- [ ] **Step 5: Add the first discovery vocabulary**

Add these exact catalog search terms:

```ts
// AWS
eks: ["Elastic Kubernetes Service", "managed Kubernetes"]
ecs: ["Elastic Container Service", "managed containers"]
rds: ["Relational Database Service", "managed relational database"]
s3: ["Simple Storage Service", "object storage"]
api-gateway: ["API Gateway", "managed API"]

// GCP
gke: ["Google Kubernetes Engine", "managed Kubernetes"]
compute-engine: ["Google Compute Engine", "virtual machine"]
cloud-storage: ["Google Cloud Storage", "object storage"]
cloud-sql: ["Google Cloud SQL", "managed relational database"]

// Kubernetes
horizontalpodautoscaler: ["Horizontal Pod Autoscaler"]
persistentvolumeclaim: ["Persistent Volume Claim"]
customresourcedefinition: ["Custom Resource Definition"]
serviceaccount: ["Service Account"]
```

Use each catalog's actual canonical ID. Do not create a new alias for a phrase
with spaces.

- [ ] **Step 6: Add supported scopes and provider relationships**

Set provider scopes:

```ts
// awsProvider and gcpProvider
supportedScopes: ["account", "region", "vpc", "subnet"],

// k8sProvider
supportedScopes: ["cluster", "namespace"],
```

Export `AWS_RELATIONSHIPS` and `GCP_RELATIONSHIPS` as empty typed arrays because
their current rules do not define canonical endpoint pairs. Built-in language
relationships remain available for both providers. Define
Kubernetes constraints in `packages/k8s/src/relationships.ts`:

```ts
import type { RelationshipDefinition } from "@archlex/model";

export const K8S_RELATIONSHIPS = [
  {
    kind: "targets",
    displayName: "Targets",
    documentation: "A Service selects or targets a workload.",
    allowedSources: ["service"],
    allowedTargets: ["pod", "deployment", "replicaset", "statefulset", "daemonset"],
  },
  {
    kind: "routes",
    displayName: "Routes",
    documentation: "An Ingress routes traffic to a Service.",
    allowedSources: ["ingress"],
    allowedTargets: ["service"],
  },
] as const satisfies readonly RelationshipDefinition[];
```

Return these arrays from each provider's `listRelationships()`.

Update the legacy `getCatalog().relationshipKinds` field from the merged
definitions without another vocabulary list:

```ts
const relationshipKinds = Array.from(
  new Set([
    ...language.relationships.map(({ kind }) => kind),
    ...Object.values(providersObj).flatMap(({ relationships }) =>
      relationships.map(({ kind }) => kind),
    ),
  ]),
);
```

In core analysis, build the selected provider's known-kind set from both
sources:

```ts
const knownRelationships = new Set([
  ...KNOWN_RELATIONSHIPS,
  ...(provider?.listRelationships?.().map(({ kind }) => kind) ?? []),
]);
```

Add this core regression test:

```ts
it("recognizes provider relationship definitions", () => {
  const archlex = createArchLex({ providers: [k8sProvider()] });
  const prepared = archlex.prepare(
    "provider k8s\nservice -[targets]-> deployment",
  );
  expect(
    prepared.diagnostics.some(
      ({ code }) => code === "AL-SEM-UNKNOWN-RELATIONSHIP",
    ),
  ).toBe(false);
});
```

- [ ] **Step 7: Include relationships in the repository validator**

Load each provider through `awsProvider()`, `gcpProvider()`, and `k8sProvider()`
inside `scripts/validate-catalog.mjs`. Call
`validateRelationshipDefinitions(catalog, provider.listRelationships?.() ?? [])`
and include the result in each provider report.

- [ ] **Step 8: Run provider and catalog verification**

```bash
pnpm --filter @archlex/diagnostics test
pnpm --filter @archlex/aws test
pnpm --filter @archlex/gcp test
pnpm --filter @archlex/k8s test
pnpm validate:catalog
```

Expected: all commands PASS and EKS resolves from `Elastic Kubernetes Service`
only through `searchTerms`, while `resolveAwsService("Elastic Kubernetes Service")`
returns `undefined`.

- [ ] **Step 9: Commit provider metadata and validation**

```bash
git add packages/aws packages/gcp packages/k8s packages/diagnostics packages/core/src/index.ts packages/core/src/index.test.ts scripts/validate-catalog.mjs
git commit -m "feat: enrich provider discovery metadata"
```

---

### Task 3: Scaffold the language-service package and document analyzer

**Files:**
- Create: `packages/language-service/package.json`
- Create: `packages/language-service/tsconfig.json`
- Create: `packages/language-service/vite.config.ts`
- Create: `packages/language-service/README.md`
- Create: `packages/language-service/LICENSE`
- Create: `packages/language-service/src/types.ts`
- Create: `packages/language-service/src/document.ts`
- Create: `packages/language-service/src/document.test.ts`
- Create: `packages/language-service/src/index.ts`
- Modify: `packages/parser/src/lexer/index.ts`
- Modify: `packages/parser/src/index.test.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `DocumentAst`, `ScopeKind`, and `CatalogMetadata` from `@archlex/model`; `parse` and `ArchLexLexer` from `@archlex/parser`.
- Produces: `LanguageDocument`, `DocumentSymbol`, `LanguageToken`, and `analyzeLanguageDocument(source)`.

- [ ] **Step 1: Create package files and dependency declarations**

Use this `package.json` shape:

```json
{
  "name": "@archlex/language-service",
  "version": "0.1.0",
  "description": "Editor-neutral language intelligence for ArchLex source",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@archlex/model": "workspace:^",
    "@archlex/parser": "workspace:^"
  },
  "devDependencies": {
    "@archlex/core": "workspace:*",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

Copy the model package's `tsconfig.json` and single-entry Vite library config,
changing only the package path. Copy the repository MIT license text. Document
the two public operations and the DOM-neutral guarantee in the README.

- [ ] **Step 2: Write failing document-analysis tests**

Create `document.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyzeLanguageDocument } from "./document.js";

describe("analyzeLanguageDocument", () => {
  it("collects directives, scopes, declarations, and relationship-introduced symbols", () => {
    const document = analyzeLanguageDocument(`provider k8s
cluster prod {
  namespace web {
    app: deployment
    service -[targets]-> app
  }
}`);

    expect(document.providerId).toBe("k8s");
    expect(document.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "app", resourceKind: "deployment", scopePath: ["cluster:prod", "namespace:web"] }),
        expect.objectContaining({ name: "service", resourceKind: "service", scopePath: ["cluster:prod", "namespace:web"] }),
      ]),
    );
  });

  it("retains tokens and symbols for incomplete source", () => {
    const document = analyzeLanguageDocument("provider aws\napi: lambda\napi -[");
    expect(document.tokens.at(-1)?.image).toBe("[");
    expect(document.symbols).toContainEqual(
      expect.objectContaining({ name: "api", resourceKind: "lambda" }),
    );
  });
});
```

Add a parser lexer regression test:

```ts
it("retains comments in a non-parser token group", () => {
  const result = ArchLexLexer.tokenize("lambda # application function");
  expect(result.tokens.map(({ image }) => image)).toEqual(["lambda"]);
  expect(result.groups.comments?.map(({ image }) => image)).toEqual([
    "# application function",
  ]);
  expect(parse("lambda # application function").ast.statements).toHaveLength(1);
});
```

- [ ] **Step 3: Run the package test and confirm failure**

```bash
pnpm install
pnpm --filter @archlex/language-service test
```

Expected: FAIL because the analyzer and public types do not exist. `pnpm install`
must add the workspace package and lockfile dependency edges without upgrading
unrelated dependencies.

- [ ] **Step 4: Retain comment tokens outside the parser stream**

Change `LineComment.group` from `Lexer.SKIPPED` to the named group `comments`.
Chevrotain will omit that group from `lexResult.tokens`, so parser behavior stays
unchanged. The language analyzer will merge `lexResult.tokens` with
`lexResult.groups.comments ?? []` and sort by `startOffset`.

- [ ] **Step 5: Define editor-neutral document types**

In `types.ts`, define:

```ts
export interface LanguageToken {
  readonly kind: string;
  readonly image: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface OffsetRange {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface DocumentSymbol {
  readonly name: string;
  readonly resourceKind: string;
  readonly providerId?: string;
  readonly scopePath: readonly string[];
  readonly declarationOffset: number;
}

export interface LanguageDocument {
  readonly source: string;
  readonly ast: DocumentAst;
  readonly tokens: readonly LanguageToken[];
  readonly symbols: readonly DocumentSymbol[];
  readonly providerId?: string;
  readonly declaredDirectives: ReadonlySet<string>;
}
```

- [ ] **Step 6: Implement document analysis**

Tokenize with `ArchLexLexer.tokenize(source)`, convert Chevrotain tokens without
exporting Chevrotain types, and call `parse(source)` for the recoverable AST.
Walk nested statements with a `scopePath` array. Add symbols from:

- named resources using `name` and `kind`;
- implicit resources using `kind` for both fields;
- relationship endpoints that have no matching visible declaration.

Deduplicate symbols by `scopePath + name`. Read the first valid provider
directive into `providerId`, and collect all directive names in
`declaredDirectives`.

- [ ] **Step 7: Export the analyzer and run package checks**

Export all public types and `analyzeLanguageDocument` from `src/index.ts`, then
run:

```bash
pnpm --filter @archlex/language-service test
pnpm --filter @archlex/language-service build
pnpm --filter @archlex/parser test
```

Expected: PASS.

- [ ] **Step 8: Commit package scaffolding and analysis**

```bash
git add packages/language-service packages/parser/src/lexer/index.ts packages/parser/src/index.test.ts pnpm-lock.yaml
git commit -m "feat(language-service): analyze ArchLex documents"
```

---

### Task 4: Implement cursor context and catalog indexing

**Files:**
- Create: `packages/language-service/src/context.ts`
- Create: `packages/language-service/src/context.test.ts`
- Create: `packages/language-service/src/catalog-index.ts`
- Create: `packages/language-service/src/catalog-index.test.ts`
- Create: `packages/language-service/src/test-fixtures.ts`
- Modify: `packages/language-service/src/types.ts`
- Modify: `packages/language-service/src/index.ts`

**Interfaces:**
- Consumes: `LanguageDocument` from Task 3 and `CatalogMetadata` from Task 1.
- Produces: `CompletionContext`, `classifyCompletionContext(document, offset)`, `CatalogIndex`, and `createCatalogIndex(catalog)`.

- [ ] **Step 1: Write failing context tests**

Use a helper where `|` marks the cursor and is removed before analysis:

```ts
it.each([
  ["|", "statement"],
  ["provider |", "directive-value"],
  ["api: |", "resource"],
  ["provider aws\napi: elastic kubernetes|", "resource"],
  ["provider aws\napi -[|", "relationship-kind"],
  ["provider aws\napi -> |", "relationship-target"],
  ["# api: |", "none"],
  ['api: lambda["human |label"]', "none"],
])("classifies %s as %s", (markedSource, expected) => {
  const offset = markedSource.indexOf("|");
  const source = markedSource.replace("|", "");
  expect(classifyCompletionContext(analyzeLanguageDocument(source), offset).kind).toBe(expected);
});
```

- [ ] **Step 2: Write failing catalog-index tests**

```ts
it("indexes one canonical resource with all searchable nomenclature", () => {
  const index = createCatalogIndex(TEST_CATALOG);
  expect(index.resourcesByProvider.aws[0]).toMatchObject({
    canonicalId: "eks",
    normalizedTerms: expect.arrayContaining([
      "eks",
      "amazon eks",
      "kubernetes",
      "elastic kubernetes service",
    ]),
  });
});
```

Create `packages/language-service/src/test-fixtures.ts` from the package's core
dev dependency:

```ts
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";

export const TEST_CATALOG = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
}).getCatalog();

export function unmark(markedSource: string): {
  readonly source: string;
  readonly offset: number;
} {
  const offset = markedSource.indexOf("|");
  if (offset < 0) throw new Error("Marked source must contain one | cursor");
  return { source: markedSource.slice(0, offset) + markedSource.slice(offset + 1), offset };
}
```

Import this fixture and helper from catalog-index, context, matching, completion,
and performance tests.

- [ ] **Step 3: Run tests and confirm failure**

```bash
pnpm --filter @archlex/language-service test
```

Expected: FAIL because the classifier and index do not exist.

- [ ] **Step 4: Implement token-based context classification**

Define this discriminated union:

```ts
export type CompletionContext =
  | { kind: "none"; replacement: OffsetRange }
  | { kind: "statement"; replacement: OffsetRange; scopePath: readonly string[] }
  | { kind: "directive-value"; replacement: OffsetRange; directiveName: string }
  | { kind: "scope"; replacement: OffsetRange; scopePath: readonly string[] }
  | { kind: "resource"; replacement: OffsetRange; scopePath: readonly string[]; explicitProvider?: string }
  | { kind: "relationship-source" | "relationship-target"; replacement: OffsetRange; scopePath: readonly string[] }
  | { kind: "relationship-kind"; replacement: OffsetRange; scopePath: readonly string[]; sourceName?: string; targetName?: string };
```

Use token offsets and token kinds to identify comments, strings, directive
values, colons, provider dots, relationship operators, and bracketed
relationship kinds. Compute the resource replacement start from the current
declaration's kind position so a query containing spaces, such as `elastic
kubernetes`, forms one replacement range. Do not inspect the line with a grammar
regex.

- [ ] **Step 5: Implement immutable catalog indexing**

Normalize with:

```ts
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[._\s-]+/g, " ")
    .trim();
}
```

Define the index shape in `types.ts`:

```ts
export interface IndexedResource {
  readonly providerId: string;
  readonly canonicalId: string;
  readonly displayName: string;
  readonly category: string;
  readonly aliases: readonly string[];
  readonly searchTerms: readonly string[];
  readonly normalizedTerms: readonly string[];
  readonly allowedContainment: readonly string[];
}

export interface CatalogIndex {
  readonly catalog: CatalogMetadata;
  readonly resourcesByProvider: Readonly<Record<string, readonly IndexedResource[]>>;
  readonly resourcesByQualifiedId: ReadonlyMap<string, IndexedResource>;
  readonly relationshipsByProvider: Readonly<Record<string, readonly RelationshipDefinition[]>>;
}
```

Build `resourcesByProvider`, `providers`, `directives`, `scopes`, and merged
relationship definitions. Preserve original text and canonical IDs. Deduplicate
normalized terms within each indexed resource. Freeze returned arrays in tests
or expose readonly types; do not mutate catalog input.

- [ ] **Step 6: Run tests and commit**

```bash
pnpm --filter @archlex/language-service test
pnpm --filter @archlex/language-service typecheck
git add packages/language-service/src
git commit -m "feat(language-service): classify completion context"
```

Expected: tests and typecheck PASS before commit.

---

### Task 5: Implement resource, directive, scope, and snippet completion

**Files:**
- Create: `packages/language-service/src/matching.ts`
- Create: `packages/language-service/src/matching.test.ts`
- Create: `packages/language-service/src/completions.ts`
- Create: `packages/language-service/src/completions.test.ts`
- Modify: `packages/language-service/src/types.ts`
- Modify: `packages/language-service/src/index.ts`

**Interfaces:**
- Consumes: `CompletionContext` and `CatalogIndex` from Task 4.
- Produces: `CompletionKind`, `LanguageCompletion`, `CompletionRequest`, `CompletionEngine`, `createCompletionEngine(catalog)`, and `completeArchLex(request)`.

- [ ] **Step 1: Write failing matching tests**

```ts
it.each([
  ["eks", "eks", "canonical-exact"],
  ["ek", "eks", "canonical-prefix"],
  ["kubernetes", "kubernetes", "alias-exact"],
  ["amazon e", "Amazon EKS", "display-prefix"],
  ["elastic kubernetes", "Elastic Kubernetes Service", "search-token"],
])("classifies %s against %s as %s", (query, candidate, tier) => {
  expect(scoreTextMatch(query, candidate)?.tier).toBe(tier);
});

it("returns no match for unrelated terms", () => {
  expect(scoreTextMatch("database", "Amazon EKS")).toBeUndefined();
});
```

- [ ] **Step 2: Write failing completion tests for canonical insertion**

```ts
it("finds EKS through a discovery term and inserts its canonical ID", () => {
  const { source, offset } = unmark("provider aws\ncluster: elastic kubernetes|");
  const results = engine.complete(analyzeLanguageDocument(source), offset);
  expect(results[0]).toMatchObject({
    id: "resource:aws:eks",
    label: "Amazon EKS",
    insertText: "eks",
    filterText: expect.stringContaining("Elastic Kubernetes Service"),
    detail: "AWS · compute · eks",
  });
});

it("qualifies all providers when no provider directive exists", () => {
  const { source, offset } = unmark("service: kubernetes|");
  const insertions = engine
    .complete(analyzeLanguageDocument(source), offset)
    .map(({ insertText }) => insertText);
  expect(insertions).toEqual(expect.arrayContaining(["aws.eks", "gcp.gke"]));
});

it("narrows an explicit provider prefix", () => {
  const { source, offset } = unmark("service: gcp.kube|");
  const results = engine.complete(analyzeLanguageDocument(source), offset);
  expect(results.map(({ insertText }) => insertText)).toEqual(["gcp.gke"]);
});

it("discovers every registered service by canonical ID and display name", () => {
  for (const provider of Object.values(TEST_CATALOG.providers)) {
    for (const service of provider.services) {
      for (const query of [service.id, service.displayName]) {
        const source = `provider ${provider.id}\nnode: ${query}`;
        const results = engine.complete(
          analyzeLanguageDocument(source),
          source.length,
        );
        expect(
          results.some(
            ({ id, insertText }) =>
              id === `resource:${provider.id}:${service.id}` &&
              insertText === service.id,
          ),
        ).toBe(true);
      }
    }
  }
});
```

- [ ] **Step 3: Write failing directive and scope tests**

Create these helpers at the top of `completions.test.ts`:

```ts
const engine = createCompletionEngine(TEST_CATALOG);

function labelsFor(markedSource: string): string[] {
  const { source, offset } = unmark(markedSource);
  return engine
    .complete(analyzeLanguageDocument(source), offset)
    .map(({ label }) => label);
}

function relationshipLabelsFor(markedSource: string): string[] {
  const { source, offset } = unmark(markedSource);
  return engine
    .complete(analyzeLanguageDocument(source), offset)
    .filter(({ kind }) => kind === "relationship")
    .map(({ insertText }) => insertText);
}
```

```ts
it("suppresses declared and late directives", () => {
  expect(labelsFor("provider aws\n|")).not.toContain("provider");
  expect(labelsFor("provider aws\napi: lambda\n|")).not.toContain("direction");
});

it("uses provider-supported scopes", () => {
  expect(labelsFor("provider k8s\n|")).toEqual(
    expect.arrayContaining(["cluster", "namespace"]),
  );
  expect(labelsFor("provider k8s\n|")).not.toContain("vpc");
});
```

- [ ] **Step 4: Run tests and confirm failure**

```bash
pnpm --filter @archlex/language-service test
```

Expected: FAIL because matching and completion generation do not exist.

- [ ] **Step 5: Implement deterministic text matching**

Return a numeric base score and named tier in this order:

```ts
const MATCH_SCORES = {
  "canonical-exact": 0,
  "canonical-prefix": 100,
  "alias-exact": 200,
  "alias-prefix": 300,
  "display-prefix": 400,
  "search-token": 500,
  "fuzzy-subsequence": 600,
} as const;
```

Use lower scores for better results. Token matching must require every query
token in order. Fuzzy matching must preserve character order and add skipped
character count to the score.

- [ ] **Step 6: Implement the completion engine**

Define:

```ts
export type CompletionKind =
  | "directive"
  | "enum-value"
  | "scope"
  | "resource"
  | "symbol"
  | "relationship"
  | "snippet";

export interface LanguageCompletion {
  readonly id: string;
  readonly label: string;
  readonly insertText: string;
  readonly filterText: string;
  readonly kind: CompletionKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly replacement: OffsetRange;
  readonly sortScore: number;
}

export interface CompletionEngine {
  complete(
    document: LanguageDocument,
    offset: number,
    options?: { trigger?: "automatic" | "manual" },
  ): readonly LanguageCompletion[];
}

export function createCompletionEngine(catalog: CatalogMetadata): CompletionEngine;

export interface CompletionRequest {
  readonly document: LanguageDocument;
  readonly offset: number;
  readonly catalog: CatalogMetadata;
  readonly trigger?: "automatic" | "manual";
}

export function completeArchLex(
  request: CompletionRequest,
): readonly LanguageCompletion[];
```

Build the catalog index once in `createCompletionEngine`. For resource results:

- search canonical ID, display name, aliases, and search terms;
- merge matches by `providerId + canonicalId`;
- use one `filterText` containing original searchable values;
- insert the current provider's unqualified canonical ID;
- insert `provider.canonicalId` for explicit cross-provider or provider-less results;
- boost resources whose `allowedContainment` includes the innermost scope;
- keep incompatible resources below compatible matches;
- use `providerId + canonicalId` as the final stable tie breaker.

For statements and directives, use the structured metadata. Emit snippets with
`kind: "snippet"` and preserve Monaco snippet syntax from metadata.
Default the trigger to `manual` for API callers. Automatic calls must return no
results in comments, labels, completed tokens, or an empty statement where the
user has not started a word.

Implement `completeArchLex()` as the one-off convenience API that creates an
engine from `request.catalog` and delegates to `engine.complete()`. Editor
integrations must retain a `CompletionEngine` so they reuse the catalog index.

- [ ] **Step 7: Export the API, run package checks, and commit**

```bash
pnpm --filter @archlex/language-service test
pnpm --filter @archlex/language-service build
git add packages/language-service/src
git commit -m "feat(language-service): complete catalog resources"
```

Expected: PASS.

---

### Task 6: Add symbol visibility and semantic relationship completion

**Files:**
- Modify: `packages/language-service/src/document.ts`
- Modify: `packages/language-service/src/context.ts`
- Modify: `packages/language-service/src/completions.ts`
- Modify: `packages/language-service/src/document.test.ts`
- Modify: `packages/language-service/src/completions.test.ts`
- Create: `packages/language-service/src/performance.test.ts`

**Interfaces:**
- Consumes: `DocumentSymbol.scopePath`, relationship definitions, and completion engine from Tasks 2 through 5.
- Produces: relationship endpoint completions, compatibility ranking, and measured language-service performance.

- [ ] **Step 1: Write failing lexical visibility tests**

```ts
it("ranks local symbols above parent symbols and excludes sibling symbols", () => {
  const { source, offset } = unmark(`provider k8s
cluster prod {
  shared: service
  namespace first {
    local: deployment
    local -> |
  }
  namespace second {
    sibling: deployment
  }
}`);
  const symbols = engine
    .complete(analyzeLanguageDocument(source), offset)
    .filter(({ kind }) => kind === "symbol");
  expect(symbols.map(({ insertText }) => insertText)).toEqual(["local", "shared"]);
});
```

Add the shadowing case:

```ts
it("uses the nearest declaration when a symbol shadows its parent", () => {
  const { source, offset } = unmark(`provider k8s
cluster prod {
  app: service
  namespace web {
    app: deployment
    app -> |
  }
}`);
  const symbols = engine
    .complete(analyzeLanguageDocument(source), offset)
    .filter(
      ({ kind, insertText }) => kind === "symbol" && insertText === "app",
    );
  expect(symbols).toHaveLength(1);
  expect(symbols[0]?.documentation).toContain("deployment");
});
```

- [ ] **Step 2: Write failing relationship-ranking tests**

```ts
it("boosts provider relationships compatible with resolved endpoints", () => {
  const { source, offset } = unmark(`provider k8s
cluster prod {
  namespace web {
    edge: ingress
    app: service
    edge -[|]-> app
  }
}`);
  const relationships = engine
    .complete(analyzeLanguageDocument(source), offset)
    .filter(({ kind }) => kind === "relationship");
  expect(relationships[0]?.insertText).toBe("routes");
});

it("keeps incompatible relationship kinds visible below compatible kinds", () => {
  const results = relationshipLabelsFor("edge -[|]-> app");
  expect(results).toContain("targets");
  expect(results.indexOf("routes")).toBeLessThan(results.indexOf("targets"));
});
```

- [ ] **Step 3: Run tests and confirm failure**

```bash
pnpm --filter @archlex/language-service test
```

Expected: FAIL on symbol visibility and compatibility order.

- [ ] **Step 4: Implement scope visibility and shadowing**

A symbol is visible when its `scopePath` is a prefix of the cursor's scope path.
Compute distance as `cursorScope.length - symbolScope.length`. Sort distance
ascending, then declaration offset ascending. Deduplicate by name after sorting
so the nearest declaration wins.

Use the same logic for relationship source and target contexts. Do not offer
resource catalog entries in an endpoint-only context.

- [ ] **Step 5: Resolve relationship endpoints and rank definitions**

Resolve `sourceName` and `targetName` against visible symbols, then resolve each
symbol's provider and canonical resource through the catalog index. Merge core
relationship definitions with the active provider's definitions by kind;
provider documentation and constraints override core fields.

Apply these semantic penalties after the text score:

```ts
const SEMANTIC_PENALTY = {
  differentProvider: 40,
  incompatibleContainment: 60,
  parentScopeDistance: 10,
  incompatibleRelationshipSource: 80,
  incompatibleRelationshipTarget: 80,
} as const;
```

Keep incompatible relationships in the result set. Use kind as the final tie
breaker.

- [ ] **Step 6: Add the 20 ms language-service performance fixture**

Use the language-service package's `@archlex/core` dev dependency from Task 3.
Create the reference catalog with
`createArchLex({ providers: [awsProvider(), gcpProvider(), k8sProvider()] }).getCatalog()`
using the core re-exports. Keep core out of runtime dependencies. Warm the engine
with 20 calls, measure 100 calls with `performance.now()`, sort durations, and
assert:

```ts
const p95 = durations[Math.floor(durations.length * 0.95)];
expect(p95).toBeLessThan(20);
```

The measured request must complete `elastic kubernetes` in a document containing
at least 100 declarations and the full registered provider catalog.

- [ ] **Step 7: Run checks and commit**

```bash
pnpm --filter @archlex/language-service test
pnpm --filter @archlex/language-service build
git add packages/language-service
git commit -m "feat(language-service): complete symbols and relationships"
```

Expected: PASS, including the p95 assertion.

---

### Task 7: Replace the playground Monaco provider

**Files:**
- Modify: `apps/playground/package.json`
- Modify: `apps/playground/src/App.tsx:1-20,395-415`
- Modify: `apps/playground/src/components/Editor.tsx:1-120`
- Modify: `apps/playground/src/monaco/archlex-language.ts`
- Create: `apps/playground/src/monaco/archlex-language.test.ts`
- Modify: `apps/playground/src/monaco/hover.ts`
- Create: `apps/playground/src/monaco/hover.test.ts`
- Replace: `apps/playground/src/monaco/completions.ts`
- Create: `apps/playground/src/monaco/completions.test.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `CatalogMetadata`, `createCompletionEngine`, `analyzeLanguageDocument`, and `LanguageCompletion`.
- Produces: `createMonacoCompletionProvider(monaco, engine, options?): Monaco.languages.CompletionItemProvider` for unit testing.
- Produces: `registerCompletionProvider(monaco, catalog, options?): Monaco.IDisposable`.
- Produces: `CompletionMetrics = { record(durationMs: number): void }` for browser measurement.
- Produces: `createArchLexTokensProvider(catalog): Monaco.languages.IMonarchLanguage`.
- Produces: `createHoverProvider(monaco, catalog, diagnostics): Monaco.languages.HoverProvider`.
- Produces: `registerHoverProvider(monaco, catalog, diagnostics): Monaco.IDisposable`.

- [ ] **Step 1: Add the workspace dependency**

Add `"@archlex/language-service": "workspace:^"` to playground dependencies and
run `pnpm install`. Confirm the lockfile changes only for the new dependency
edges.

- [ ] **Step 2: Write failing catalog-driven tokenizer and hover tests**

Build `TEST_CATALOG` in each playground test file from the existing app
dependencies:

```ts
const TEST_CATALOG = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
}).getCatalog();
```

Create `archlex-language.test.ts`:

```ts
it("derives Monarch vocabulary from the catalog", () => {
  const tokens = createArchLexTokensProvider(TEST_CATALOG);
  expect(tokens.directives).toEqual(["provider", "direction", "validation", "theme"]);
  expect(tokens.scopes).toEqual(["account", "region", "vpc", "subnet", "cluster", "namespace"]);
  expect(tokens.providers).toEqual(["aws", "gcp", "k8s"]);
  expect(tokens.directiveValues).toEqual(
    expect.arrayContaining(["LR", "strict", "dark"]),
  );
});
```

Create `hover.test.ts` with this Monaco/model stub:

```ts
const monacoStub = {
  Range: class Range {
    constructor(
      readonly startLineNumber: number,
      readonly startColumn: number,
      readonly endLineNumber: number,
      readonly endColumn: number,
    ) {}
  },
} as unknown as typeof Monaco;

function createModel(source: string): Monaco.editor.ITextModel {
  return {
    getWordAtPosition: () => ({ word: "eks", startColumn: 10, endColumn: 13 }),
    getLineContent: (line: number) => source.split("\n")[line - 1] ?? "",
  } as unknown as Monaco.editor.ITextModel;
}
```

Then add the assertion:

```ts
it("describes catalog resources and discovery terms", async () => {
  const provider = createHoverProvider(monacoStub, TEST_CATALOG, []);
  const hover = await Promise.resolve(
    provider.provideHover(
      createModel("provider aws\ncluster: eks"),
      { lineNumber: 2, column: 11 },
      {} as Monaco.CancellationToken,
    ),
  );
  expect(hover?.contents[0]?.value).toContain("Amazon EKS");
  expect(hover?.contents[0]?.value).toContain("Elastic Kubernetes Service");
  expect(hover?.contents[0]?.value).toContain("Canonical ID: `eks`");
});
```

- [ ] **Step 3: Implement catalog-driven highlighting and hover**

Replace the exported static Monarch vocabulary with
`createArchLexTokensProvider(catalog)`. Keep punctuation regexes and tokenizer
states, but classify identifiers through generated `directives`, `scopes`,
`providers`, and `directiveValues` arrays. Change
`registerArchLexLanguage(monaco, catalog)` to install the generated provider.

Replace `KEYWORD_DOCS`, `SERVICE_DOCS`, and `RELATIONSHIP_DOCS` with maps built
from `catalog.language`, `catalog.providers[*].services`, and merged relationship
definitions. Export `createHoverProvider()` for tests and make
`registerHoverProvider()` a registration wrapper. Preserve diagnostic hover as
the first-priority branch.

- [ ] **Step 4: Write failing pure completion-adapter tests**

Create these local helpers in `completions.test.ts`:

```ts
function positionAt(value: string, offset: number) {
  const lines = value.slice(0, offset).split("\n");
  return { lineNumber: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function createVersionedModel(value: string, initialVersion = 1) {
  let version = initialVersion;
  return {
    getValue: () => value,
    getVersionId: () => version,
    setVersion: (next: number) => { version = next; },
    getPositionAt: (offset: number) => positionAt(value, offset),
    getOffsetAt: ({ lineNumber, column }: { lineNumber: number; column: number }) => {
      const lines = value.split("\n");
      return lines.slice(0, lineNumber - 1).reduce((sum, line) => sum + line.length + 1, 0) + column - 1;
    },
  } as unknown as Monaco.editor.ITextModel & { setVersion(next: number): void };
}

const createModel = (value: string) => createVersionedModel(value);
const POSITION = { lineNumber: 1, column: 1 };
const monacoStub = {
  languages: {
    CompletionItemKind: { Keyword: 1, EnumMember: 2, Class: 3, Variable: 4, Value: 5, Snippet: 6 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    CompletionTriggerKind: { Invoke: 0 },
    registerCompletionItemProvider: vi.fn(),
  },
} as unknown as typeof Monaco;
```

Expose a pure conversion helper and test it without mounting React:

```ts
it("converts offset spans and canonical insertion to Monaco values", () => {
  const model = createModel("provider aws\ncluster: elastic kubernetes");
  const item = toMonacoCompletion(monacoStub, model, {
    id: "resource:aws:eks",
    label: "Amazon EKS",
    insertText: "eks",
    filterText: "eks Amazon EKS Elastic Kubernetes Service",
    kind: "resource",
    detail: "AWS · compute · eks",
    replacement: { startOffset: 22, endOffset: 40 },
    sortScore: 0,
  });

  expect(item.insertText).toBe("eks");
  expect(item.range).toEqual({
    startLineNumber: 2,
    startColumn: 10,
    endLineNumber: 2,
    endColumn: 28,
  });
});
```

Add these focused conversion and failure tests:

```ts
it("marks snippets and pads sort scores", () => {
  const item = toMonacoCompletion(monacoStub, createModel(""), {
    id: "scope:cluster",
    label: "cluster",
    insertText: "cluster ${1:name} {\n  $0\n}",
    filterText: "cluster",
    kind: "snippet",
    replacement: { startOffset: 0, endOffset: 0 },
    sortScore: 42,
  });
  expect(item.insertTextRules).toBe(
    monacoStub.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  );
  expect(item.sortText).toBe("00000042:scope:cluster");
});

it("contains language-service failures", () => {
  const engine = { complete: vi.fn(() => { throw new Error("broken"); }) };
  const provider = createMonacoCompletionProvider(monacoStub, engine);
  expect(
    provider.provideCompletionItems(
      createModel("provider aws"),
      POSITION,
      {} as Monaco.languages.CompletionContext,
      {} as Monaco.CancellationToken,
    ),
  ).toEqual({ suggestions: [] });
});
```

- [ ] **Step 5: Write a failing cache/lifecycle test**

Use Monaco stubs to capture the registered provider:

```ts
it("caches analysis by model version and returns Monaco's disposable", () => {
  const analyze = vi.fn(analyzeLanguageDocument);
  const registration = { dispose: vi.fn() };
  monacoStub.languages.registerCompletionItemProvider.mockReturnValue(registration);
  const disposable = registerCompletionProvider(monacoStub, TEST_CATALOG, {
    analyze,
  });
  const provider = monacoStub.languages.registerCompletionItemProvider.mock.calls[0][1];
  const model = createVersionedModel("provider aws\napi: e", 1);
  const context = {} as Monaco.languages.CompletionContext;
  const token = {} as Monaco.CancellationToken;
  provider.provideCompletionItems(model, POSITION, context, token);
  provider.provideCompletionItems(model, POSITION, context, token);
  model.setVersion(2);
  provider.provideCompletionItems(model, POSITION, context, token);
  expect(analyze).toHaveBeenCalledTimes(2);
  expect(disposable).toBe(registration);
});
```

Define the third `registerCompletionProvider` argument as
`CompletionProviderOptions = { metrics?: CompletionMetrics; analyze?: typeof analyzeLanguageDocument }`.
Production calls omit it.

- [ ] **Step 6: Run playground unit tests and confirm failure**

```bash
pnpm --filter @archlex/playground test -- --run src/monaco/completions.test.ts
```

Expected: FAIL because the adapter still owns hard-coded arrays and lacks the
new interface.

- [ ] **Step 7: Implement the thin Monaco adapter**

Create one completion engine per registration. Cache `{ version, document }` in
a `WeakMap<Monaco.editor.ITextModel, CachedDocument>`. Convert offset ranges with
`model.getPositionAt()`. Map editor-neutral kinds through one exhaustive switch.

Register punctuation trigger characters only:

```ts
triggerCharacters: [":", ".", "[", "-"],
```

Wrap analysis and completion in `try/catch`; return an empty suggestion array on
failure. Measure the entire callback with `performance.now()` and send the
duration to the optional `CompletionMetrics` sink.

Map Monaco's request context to the editor-neutral trigger:

```ts
const trigger =
  context.triggerKind === monaco.languages.CompletionTriggerKind.Invoke
    ? "manual"
    : "automatic";
const completions = engine.complete(document, offset, { trigger });
```

Delete `KEYWORDS`, `PROVIDERS`, service arrays, direction/validation arrays,
relationship arrays, and all context regexes from the playground.

- [ ] **Step 8: Pass catalog metadata through React and dispose the provider**

In `App.tsx`, create once beside the ArchLex instance:

```ts
const catalogMetadata = archlex.getCatalog();
```

Add `catalog: CatalogMetadata` to `EditorProps`, pass it from `App`, and store the
completion disposable in `completionDisposableRef`. Pass the same catalog to
`registerArchLexLanguage`, `registerCompletionProvider`, and
`registerHoverProvider`. Dispose the completion registration in the editor
cleanup alongside hover and code-action providers.

- [ ] **Step 9: Run playground checks and vocabulary audit**

```bash
pnpm --filter @archlex/playground test
pnpm --filter @archlex/playground typecheck
pnpm build:playground
rg -n "AWS_SERVICES|GCP_SERVICES|K8S_SERVICES|RELATIONSHIP_TYPES|KEYWORD_DOCS|SERVICE_DOCS|RELATIONSHIP_DOCS|\\bprovider\\s+aws" apps/playground/src/monaco
```

Expected: tests, typecheck, and build PASS. The `rg` command returns no matches.

- [ ] **Step 10: Commit Monaco integration**

```bash
git add apps/playground pnpm-lock.yaml
git commit -m "feat(playground): add semantic ArchLex completion"
```

---

### Task 8: Verify keyboard UX and Monaco performance in a browser

**Files:**
- Create: `tests/browser/monaco-completions.spec.mjs`
- Modify: `tests/browser/visual-platform.mjs`
- Modify: `apps/playground/src/App.tsx`
- Modify: `apps/playground/src/components/Editor.tsx`
- Modify: `apps/playground/src/monaco/completions.ts`

**Interfaces:**
- Consumes: the real Monaco provider from Task 7.
- Produces: browser helpers `focusEditorAtEnd(page)` and `readEditorSource(page)`.
- Produces in development/test builds: `performance` entries named `archlex.completion`.

- [ ] **Step 1: Add browser helpers**

In `Editor.tsx`, expose the controlled source on the editor section for browser
assertions:

```tsx
<section
  className="editor-pane"
  aria-label="ArchLex Source Editor"
  data-test-source={source}
>
```

In `visual-platform.mjs`, implement:

```js
export async function focusEditorAtEnd(page) {
  const editor = page.getByRole("textbox", { name: "Source" });
  await editor.focus();
  await page.keyboard.press("ControlOrMeta+End");
}

export async function readEditorSource(page) {
  return page.locator(".editor-pane").getAttribute("data-test-source");
}
```

- [ ] **Step 2: Write the browser completion tests**

Create `monaco-completions.spec.mjs` with icon fixture routing and these flows:

```js
test("finds human service names and inserts canonical syntax", async ({ page }) => {
  await page.goto("/");
  await replaceEditorSource(page, "provider aws\ncluster: elastic kubernetes");
  await focusEditorAtEnd(page);
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("Amazon EKS");
  await page.keyboard.press("Enter");
  await expect.poll(() => readEditorSource(page)).toBe("provider aws\ncluster: eks");
});

test("completes visible nodes and relationship kinds", async ({ page }) => {
  await page.goto("/");
  await replaceEditorSource(page, `provider k8s
edge: ingress
app: service
edge -[`);
  await focusEditorAtEnd(page);
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("Routes");
});
```

Add these cases to the same file:

```js
test("qualifies provider-less resources and narrows explicit prefixes", async ({ page }) => {
  await page.goto("/");
  await replaceEditorSource(page, "service: kubernetes");
  await focusEditorAtEnd(page);
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("aws.eks");

  await replaceEditorSource(page, "service: gcp.kube");
  await focusEditorAtEnd(page);
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("gcp.gke");
  await expect(page.locator(".suggest-widget")).not.toContainText("aws.eks");
});

test("completes endpoints and stays quiet in comments and labels", async ({ page }) => {
  await page.goto("/");
  await replaceEditorSource(page, "provider aws\napi: lambda\napi -> a");
  await focusEditorAtEnd(page);
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("api");

  for (const source of ['api: lambda["human label"]', "# api: lambda"]) {
    await replaceEditorSource(page, source);
    await focusEditorAtEnd(page);
    await page.keyboard.type("x");
    await expect(page.locator(".suggest-widget.visible")).toHaveCount(0);
  }
});
```

- [ ] **Step 3: Add browser performance entries**

Around the provider callback, add:

```ts
const startedAt = performance.now();
try {
  return provideSuggestions();
} finally {
  performance.measure("archlex.completion", {
    start: startedAt,
    end: performance.now(),
  });
}
```

The callback must still use the optional metrics sink for unit tests.

- [ ] **Step 4: Assert the 50 ms browser p95 budget**

In the browser spec, issue 20 warm requests and 100 measured requests against a
source with at least 100 declarations. Read entries with
`performance.getEntriesByName("archlex.completion")`, sort their durations, and
assert the 95th percentile is less than 50. Clear entries before and after the
test.

- [ ] **Step 5: Run focused browser tests**

```bash
pnpm exec playwright test tests/browser/monaco-completions.spec.mjs --project=chromium
```

Expected: all completion and performance tests PASS.

- [ ] **Step 6: Commit browser coverage**

```bash
git add tests/browser/monaco-completions.spec.mjs tests/browser/visual-platform.mjs apps/playground/src/App.tsx apps/playground/src/components/Editor.tsx apps/playground/src/monaco/completions.ts
git commit -m "test(playground): cover Monaco language completion"
```

---

### Task 9: Document and release the language-intelligence contracts

**Files:**
- Create: `packages/language-service/CHANGELOG.md`
- Modify: `docs/specs/public-api.md`
- Modify: `docs/specs/language.md`
- Modify: `docs/specs/playground.md`
- Modify: `docs/specs/aws-semantics.md`
- Modify: `docs/specs/gcp-semantics.md`
- Modify: `docs/specs/k8s-semantics.md`
- Modify: `README.md`
- Create: `.changeset/monaco-language-intelligence.md`

**Interfaces:**
- Consumes: final public APIs and behavior from Tasks 1 through 8.
- Produces: product documentation and release metadata for `@archlex/model`, `@archlex/core`, `@archlex/diagnostics`, `@archlex/parser`, all provider packages, and `@archlex/language-service`.

- [ ] **Step 1: Update public API documentation**

Document imports and a minimal non-Monaco example:

```ts
import { createCompletionEngine, analyzeLanguageDocument } from "@archlex/language-service";

const engine = createCompletionEngine(archlex.getCatalog());
const document = analyzeLanguageDocument("provider aws\nservice: elastic kubernetes");
const suggestions = engine.complete(document, document.source.length);
```

List `searchTerms`, supported scopes, provider relationships, structured language
metadata, completion result fields, canonical insertion, and qualification rules.

- [ ] **Step 2: Update language and playground specs**

Add these product requirements in prose and examples:

- catalogs own provider nomenclature;
- grammar metadata owns directives, scopes, and operators;
- aliases are accepted syntax while search terms are discovery-only;
- the playground inserts canonical IDs;
- Monaco highlighting and hover read the same metadata as completion;
- endpoint completion follows lexical scope;
- relationship compatibility changes rank without hiding results;
- comments and labels stay quiet;
- completion performs no network or render work.

- [ ] **Step 3: Update provider semantic docs and root onboarding**

For AWS, show `Elastic Kubernetes Service` finding `eks`. For GCP, show
`Google Kubernetes Engine` finding `gke`. For Kubernetes, show expanded resource
names and `targets`/`routes` relationship constraints. Add
`@archlex/language-service` to the root package overview.

- [ ] **Step 4: Add one changeset**

Create:

```md
---
"@archlex/model": minor
"@archlex/core": minor
"@archlex/diagnostics": minor
"@archlex/parser": minor
"@archlex/aws": minor
"@archlex/gcp": minor
"@archlex/k8s": minor
"@archlex/language-service": minor
---

Add editor-neutral ArchLex language intelligence, catalog search nomenclature,
structured grammar metadata, provider relationship semantics, and canonical
Monaco completion.
```

Do not add a changeset entry for the private playground package.

- [ ] **Step 5: Generate and verify documentation**

```bash
pnpm generate-docs
pnpm build:docs
pnpm verify:sites
```

Expected: all commands PASS. Commit generated MCP documentation resources if
`pnpm generate-docs` changes them.

- [ ] **Step 6: Run the complete verification pipeline**

```bash
pnpm validate:catalog
pnpm test:browser
pnpm check
git diff --check
git status --short
```

Expected: all commands PASS. `git status --short` lists only documentation,
generated resource, changelog, and changeset files intended for this task.

- [ ] **Step 7: Commit docs and release metadata**

```bash
git add README.md docs packages/language-service/CHANGELOG.md .changeset/monaco-language-intelligence.md apps/mcp-server/src/generated
git commit -m "docs: publish language intelligence guide"
```

- [ ] **Step 8: Verify the final commit state**

```bash
git status --short
git log --oneline -9
```

Expected: the worktree is clean and the log contains one reviewed commit for
each task boundary.
