# Contribution Guide

## Start with the product contract

Before you edit code, identify the contract that changes. ArchLex publishes
language syntax, TypeScript APIs, provider catalogs, diagnostic codes, SVG
behavior, playground workflows, MCP tools, and documentation. Update the code,
tests, and matching docs in one change.

Run `pnpm install` with Node.js 22 or later. Use `pnpm check` for the full build,
typecheck, test, and lint pipeline.

## Provider map

All provider packages use the same core structure.

| Concern | AWS | Google Cloud | Kubernetes |
| --- | --- | --- | --- |
| Package | `packages/aws` | `packages/gcp` | `packages/k8s` |
| Provider ID | `aws` | `gcp` | `k8s` |
| Factory | `awsProvider()` | `gcpProvider()` | `k8sProvider()` |
| Diagnostic prefix | `AWS-` | `GCP-` | `K8S-` |
| Example resource | `lambda` | `cloud-run` | `deployment` |
| Main scopes | account, region, VPC, subnet | account, region, VPC, subnet | cluster, namespace |

Each provider keeps catalog definitions in `src/catalog/`, rule modules in
`src/rules/`, diagnostic constants in `src/registry.ts`, and public exports in
`src/index.ts`. Provider packages also keep icon definitions under `src/icons/`
and official source files under `assets/official/` when licensing permits local
bundling.

## Add a catalog resource

1. Add the resource through the package `defineService` helper.
2. Choose a stable canonical ID and unique aliases.
3. Set the shared category, display name, icon key, and allowed containment.
4. Add bundled artwork or a CDN path mapping.
5. Add catalog, alias, containment, and icon tests.
6. Run `pnpm validate:catalog`.

Use provider-qualified aliases consistently:

```ts
// AWS
aliases: ["aws.lambda", "function"]

// Google Cloud
aliases: ["gcp.cloud-run"]

// Kubernetes
aliases: ["k8s.deployment", "deploy"]
```

Do not reuse an existing canonical ID or alias within one provider. Keep
canonical IDs stable within a major version. Add a deprecated alias when you
need to preserve an old spelling.

## Add or update icons

Provider imports convert upstream artwork into deterministic sanitized
fragments. Do not edit `src/icons/generated.ts` by hand.

```bash
pnpm --filter @archlex/aws icons:generate
pnpm --filter @archlex/gcp icons:generate
pnpm --filter @archlex/k8s icons:generate
```

Run the matching `icons:check` command before you commit generated artwork.
Keep CDN definitions pure. They may declare a pinned base URL, host allowlist,
release ID, mappings, response limits, and attribution. They must not register a
loader or start a request during import.

AWS and Google Cloud importers account for their upstream file conventions.
The Kubernetes importer uses the pinned `kubernetes/community` icon set and
prefers unlabeled resource artwork.

## Add a semantic rule

1. Register a stable code in `src/registry.ts`.
2. Implement the rule with the package `defineRule` helper.
3. Export the rule from `src/rules/index.ts`.
4. Include it in the provider validation pass.
5. Test `normal`, `strict`, and `off` modes.
6. Update the matching provider semantics page.
7. Run `pnpm generate-docs` when the shared diagnostic registry or templates
   change.

Use the provider prefix and a descriptive domain:

```text
AWS-RDS-PROXY-NETWORK-001
GCP-DATA-CLOUD-SQL-NETWORK-001
K8S-NETWORKING-SERVICE-TARGET-001
```

Rules may use only facts present in `CloudGraph`. Do not infer IAM policies,
firewall contents, Kubernetes selectors, storage provisioning, or runtime state
unless the language models that information.

## Add a provider

1. Create `packages/<provider>` with catalog, icons, rules, registry, and public
   factory modules.
2. Implement `CloudProvider` from `@archlex/model`.
3. Add the package to core dependencies and re-export its factory.
4. Register the package in CLI, playground, MCP, scripts, TypeScript references,
   and test aliases.
5. Add a pure `CdnProviderDefinition` when the provider offers suitable artwork.
6. Extend parser and model scope unions only when the provider needs a reusable
   scope that the language does not support.
7. Add provider, integration, browser, and boundary tests.
8. Add a provider semantics page and update every provider list.

Kubernetes demonstrates a provider that introduced reusable `cluster` and
`namespace` scopes. A provider that reuses existing scopes does not need parser
changes.

## Test the affected surface

Run focused checks while you work:

```bash
pnpm --filter @archlex/core test
pnpm --filter @archlex/aws test
pnpm --filter @archlex/gcp test
pnpm --filter @archlex/k8s test
pnpm validate:catalog
```

Run `pnpm test:browser` when you change playground interaction, SVG behavior,
responsive layout, or CDN routing. Inject fixture-backed `fetchFn`
implementations in automated icon tests. Do not make unit tests depend on a
public CDN.

## Add a changeset

Run `pnpm changeset` when you modify a published package under `packages/`.
Describe the reader-visible effect and choose the release level that matches the
public contract.

## Keep documentation current

Update the relevant `docs/` page in the same change as product behavior. The
docs app publishes these Markdown files through symlinks, and the MCP build
embeds them as documentation resources.

Do not edit generated diagnostic pages under `docs/errors/AL-*.md` or
`docs/errors/index.md`. Change the registry or generator, then run:

```bash
pnpm generate-docs
pnpm build:docs
pnpm verify:sites
```

Review [AGENTS.md](../../AGENTS.md) for repository-wide requirements.
