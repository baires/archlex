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

### `@archlex/icons`

```text
packages/icons/src/
├── cache.ts       # Persistent disk-based cache manager with TTL expiration
├── provider.ts    # CDN provider abstraction with name mapping & fallbacks
├── loader.ts      # Singleton IconLoader orchestrator
├── sanitizer.ts   # Security-hardened SVG validator
├── fallback.ts    # Generic cloud icon fallback
├── types.ts       # TypeScript interfaces and type definitions
└── index.ts       # Public exports
```

The `@archlex/icons` package provides dynamic CDN icon loading for Node.js environments. Icons not included in bundled manifests are fetched from CDN, sanitized, and cached persistently. See [Dynamic CDN Icons Guide](../guides/dynamic-cdn-icons.md) for configuration and usage.

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
2. **For bundled icons:** Place the sanitized SVG icon fragment in `src/icons/svg/aws-lambda.svg`.
3. **For CDN-only icons:** Add a name mapping in `src/icons/cdn.ts`:
```ts
export const AWS_ICON_NAME_MAPPING: Record<string, string> = {
  lambda: "Compute_AWSLambda",
  // Add your new service here
};
```
4. Add table-driven tests in `packages/aws/src/catalog/catalog.test.ts`.

**Icon Resolution Priority:**
1. Bundled icon (if present in `AWS_SANITIZED_ICONS`)
2. CDN icon (fetched via `IconLoader.get()` in Node.js environments)
3. No icon (returns `undefined`)

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

Adding a new cloud provider requires **zero changes** to `@archlex/parser`, `@archlex/layout-elk`, or `@archlex/renderer-svg`. GCP (`packages/gcp`) is the reference implementation of this workflow.

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
4. Register it in `createArchLex({ providers: [awsProvider(), gcpProvider(), azureProvider()] })`.

---

## Testing & Quality Assurance Standards

- **Unit Tests**: Place unit tests next to source files or in `packages/<pkg>/src/__tests__/`.
- **Property Tests**: Use `fast-check` for grammar and recovery robustness.
- **Boundary Verification**: Ensure `pnpm run check` runs clean without violating package dependency matrix rules.
