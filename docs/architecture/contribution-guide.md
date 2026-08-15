# ArchLex Contribution & Extension Guide

This document outlines the architecture patterns, directory conventions, and contribution workflows for expanding ArchLex (adding AWS services, semantic rules, layout engines, renderers, or new cloud providers).

---

## Package Directory Standards

Every package in `packages/` enforces clear internal subdirectories and exports strictly through `src/index.ts` (or documented subpaths in `package.json`).

### `@archlex/aws`

```text
packages/aws/src/
├── catalog/       # Service definitions, category lists, and aliases
├── icons/         # Sanitized SVG icon fragments and metadata manifest
├── rules/         # Modular semantic validation rules grouped by domain
│   ├── compute/
│   ├── database/
│   ├── messaging/
│   ├── networking/
│   └── storage/
├── builder.ts     # Declarative defineService and defineRule helpers
├── registry.ts    # Central registry of AWS diagnostic codes
└── index.ts       # Public provider export (awsProvider)
```

### `@archlex/gcp`

```text
packages/gcp/src/
├── catalog/       # Service definitions, category lists, and aliases
├── icons/         # Sanitized SVG icon fragments, metadata manifest, and CDN config
├── rules/         # Modular semantic validation rules grouped by domain
├── builder.ts     # Declarative defineService and defineRule helpers
├── registry.ts    # Central registry of GCP diagnostic codes
└── index.ts       # Public provider export (gcpProvider)
```

GCP icon ingestion (`scripts/import-official-icons.mjs`) adds a CSS-inlining pre-step: official Google artwork ships presentational `<style>` blocks, which are resolved into plain attributes before the shared sanitizer policy runs.

### `@archlex/k8s`

`packages/k8s` follows the same catalog, icon, rule, builder, registry, and public
export structure. It also owns the Kubernetes-specific `cluster` and `namespace`
containment semantics and a CDN definition pinned to an immutable
`kubernetes/community` commit.

### Icon runtime packages

```text
packages/icons-core/src/
├── provider.ts    # Pinned URL validation and CDN candidate fetching
├── loader.ts      # Deduplication, concurrency, caching, and fallbacks
├── sanitizer.ts   # Browser-safe SVG validation and Web Crypto checksums
├── fallback.ts    # Generic cloud icon fallback
└── types.ts       # Runtime-neutral contracts

packages/icons-browser/src/
├── memory-cache.ts # Per-session sanitized icon cache
└── index.ts        # createBrowserIconLoader()

packages/icons-node/src/
├── cache.ts        # Persistent TTL filesystem cache with atomic writes
└── index.ts        # createNodeIconLoader()
```

`@archlex/icons-core` contains no Node imports or import-time registration.
Applications explicitly pass pure provider definitions to
`@archlex/icons-browser` or `@archlex/icons-node`. The legacy
`@archlex/icons` package remains a Node compatibility facade during migration.
See the [Dynamic CDN Icons Guide](../guides/dynamic-cdn-icons.md) for the
prepare/load/render flow and cache behavior.

### `@archlex/parser`

```text
packages/parser/src/
├── lexer/         # Token definitions and Chevrotain Lexer instance
├── cst/           # Chevrotain CstParser definitions
├── visitor/       # CST-to-AST conversion visitor and span mapping
├── recovery/      # Error recovery strategies & AL-PARSE-* diagnostics
└── index.ts       # Public parse() export
```

### `@archlex/layout-elk`

```text
packages/layout-elk/src/
├── adapter/       # CloudGraph <-> ELK compound graph conversion
├── worker/        # Web Worker protocol (v1.0.0) & inline fallback
├── cache/         # Geometry fingerprinting and cache utilities
└── index.ts       # Public layout engine exports
```

### `@archlex/renderer-svg`

```text
packages/renderer-svg/src/
├── serializer/    # DOM-free SVG string generator & element mappings
├── theme/         # Theme tokens (light, dark, custom)
├── accessibility/ # ARIA, role, and focus attribute helpers
└── index.ts       # Public graph renderer exports
```

---

## Contributor Workflows

### 1. Adding an AWS Service to the Catalog

To add a new AWS service:
1. Register the service using `defineService`:
```ts
import { defineService } from "./builder.js";

export const lambdaService = defineService({
  id: "lambda",
  displayName: "AWS Lambda",
  category: "compute",
  aliases: ["aws.lambda", "function"],
  iconKey: "aws-lambda"
});
```
2. **For bundled icons:** Add the official SVG under `assets/official/` and run
   the package's `icons:generate` workflow. Never hand-edit `generated.ts`.
3. **For CDN-only icons:** Add a name mapping in `src/icons/cdn.ts`:
```ts
export const AWS_CDN_PROVIDER: CdnProviderDefinition = {
  // Keep the existing pinned URL, allowlist, release, limits, and attribution.
  mappings: {
    lambda: "AWSLambda",
  // Add your new service here
  },
};
```
4. Keep the provider definition pure: importing `@archlex/aws` must not
   register a loader, read runtime configuration, or start a request.
5. Add table-driven catalog tests and fixture-backed CDN definition tests.

**Icon Resolution Priority:**
1. Bundled icon (if present in `AWS_SANITIZED_ICONS`)
2. Sanitized CDN icon loaded explicitly between `prepare()` and
   `renderPrepared()`
3. Expired Node cache entry, when available after a refresh failure
4. Generic sanitized fallback plus a non-fatal structured warning

See [Dynamic CDN Icons Guide](../guides/dynamic-cdn-icons.md) for details on CDN configuration and cache management.

---

### 2. Adding a Semantic Validation Rule

Semantic validation rules enforce architectural correctness. Every rule must have a globally unique diagnostic code formatted as `AWS-<DOMAIN>-<RULE>-NNN`.

1. Register the diagnostic code in `src/registry.ts`:
```ts
export const AWS_DIAGNOSTIC_CODES = {
  RDS_PROXY_NETWORK: "AWS-RDS-PROXY-NETWORK-001",
  LAMBDA_VPC_SUBNET: "AWS-LAMBDA-VPC-SUBNET-001"
} as const;
```

2. Author the rule using `defineRule` in `src/rules/<domain>/<rule-name>.ts`:
```ts
import { defineRule } from "../../builder.js";

export const rdsProxyNetworkRule = defineRule({
  code: "AWS-RDS-PROXY-NETWORK-001",
  severity: "error",
  summary: "RDS Proxy and its target must have compatible VPC placement.",
  validate(graph) {
    // Inspection logic returning Diagnostic[]
  }
});
```

3. Export the rule from `src/rules/index.ts` to include it in `awsProvider().validateGraph()`.
4. Add unit tests verifying `normal`, `strict`, and `off` validation mode outcomes.

---

### 3. Adding a New Cloud Provider (e.g. Azure)

Adding a provider that uses existing scopes requires no changes to
`@archlex/parser`, `@archlex/layout-elk`, or `@archlex/renderer-svg`. GCP
(`packages/gcp`) and Kubernetes (`packages/k8s`) are reference implementations.
If a provider needs a new reusable scope kind, extend the model and grammar with
focused parser and boundary tests.

1. Create a new package shell `packages/<provider>`.
2. Implement the `CloudProvider` interface from `@archlex/model`:
```ts
import type {
  CloudGraph,
  CloudProvider,
  Diagnostic,
  ServiceMetadata,
  ValidationMode,
} from "@archlex/model";

export function azureProvider(): CloudProvider {
  return {
    id: "azure",
    name: "Microsoft Azure",
    catalogVersion: "2026-07-29",
    supports(serviceKind: string): boolean { /* ... */ },
    resolveService(serviceKind: string): ServiceMetadata | undefined { /* ... */ },
    validateGraph(
      graph: CloudGraph,
      mode: ValidationMode = "normal",
    ): readonly Diagnostic[] { /* ... */ }
  };
}
```
3. Add `@archlex/<provider>` to `packages/core` dependencies, re-export the provider from `packages/core/src/index.ts`, and extend the matrix in `tests/boundary-rules.test.ts`.
4. Export a pure, version-pinned `CdnProviderDefinition`. Use HTTPS, an
   explicit host allowlist, immutable release identification, response limits,
   mappings, and attribution. If the URL cannot carry a pinned version, record
   a SHA-256 integrity value for every mapped asset.
5. Register the cloud provider in
   `createArchLex({ providers: [awsProvider(), gcpProvider(), azureProvider()] })`
   and separately register its CDN definition with the selected browser or
   Node icon adapter.

---

## Testing & Quality Assurance Standards

- **Unit Tests**: Place unit tests next to source files or in `packages/<pkg>/src/__tests__/`.
- **Property Tests**: Use `fast-check` for grammar and recovery robustness.
- **Boundary Verification**: Ensure `pnpm run check` runs clean without violating package dependency matrix rules.
- **Dynamic Icon Tests**: Inject fixture-backed `fetchFn` implementations.
  Repository tests must never depend on public CDN availability.
- **Runtime Coverage**: For shared loader changes, verify browser and Node
  adapters produce equivalent sanitized records, Node cache entries survive
  loader reconstruction, and browser bundles contain no Node-only references.
