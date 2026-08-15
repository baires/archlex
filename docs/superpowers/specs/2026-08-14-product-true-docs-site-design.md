# Product-True Documentation Site Design

## Goal

Readers should find documentation that matches the shipped ArchLex language,
packages, providers, applications, and runtime behavior. Contributors should
update that documentation whenever they change the product.

## Scope

The rewrite covers each hand-written page that `apps/docs` publishes, plus the
documentation index and onboarding pages:

- `apps/docs/pages/index.mdx`
- `apps/docs/pages/getting-started.mdx`
- `docs/README.md`
- `docs/architecture/contribution-guide.md`
- `docs/architecture/system-architecture.md`
- `docs/errors/README.md`
- `docs/guides/dynamic-cdn-icons.md`
- `docs/guides/mcp-server.md`
- `docs/guides/relationship-types.md`
- `docs/specs/aws-semantics.md`
- `docs/specs/gcp-semantics.md`
- `docs/specs/k8s-semantics.md`
- `docs/specs/language.md`
- `docs/specs/layout-rendering.md`
- `docs/specs/playground.md`
- `docs/specs/public-api.md`

The change will also add a documentation maintenance policy to `AGENTS.md`.

The rewrite will preserve routes and filenames. It may simplify headings and
copy, but it will retain established anchors when another page links to them.

## Generated Content Boundary

The diagnostic generator owns these files:

- `docs/errors/index.md`
- `docs/errors/AL-*.md`

Contributors will update diagnostic registries and templates, then run
`pnpm generate-docs`. They will not edit generated diagnostic pages by hand.

The rewrite excludes `docs/superpowers/` because those files record planning
history rather than product documentation. It also excludes publishing runbooks
that `apps/docs` does not publish.

## Sources of Truth

Each page will derive claims from a concrete product source:

| Documentation concern | Product source |
| --- | --- |
| Language grammar and scopes | Parser lexer, AST types, parser tests |
| Public API and provider registration | `@archlex/core` exports and types |
| Provider resources and aliases | AWS, Google Cloud, and Kubernetes catalogs |
| Provider rules and validation modes | Provider registries, rule modules, tests |
| Layout, SVG, accessibility, and icons | Layout, renderer, icon runtime code and tests |
| Playground behavior | React components, render pipeline, examples, browser tests |
| MCP tools, schemas, resources, and endpoints | MCP handlers, schemas, and server tests |
| Contributor commands | Root and package `package.json` scripts |
| Diagnostic pages | Diagnostic registries and documentation generator |

The docs will avoid catalog totals and similar values that contributors can
change without a stable generated reference. When a count helps readers, the
copy will use a durable range or tell readers how to query the current catalog.

## Information Architecture

### Landing and onboarding

The landing and getting-started pages will explain the product in task order:

1. Install core and provider packages.
2. Register AWS, Google Cloud, and Kubernetes providers once.
3. Select one provider in each source.
4. Render SVG and inspect diagnostics.
5. Follow links for language, provider, API, and troubleshooting details.

One shared setup will register all three providers. All source examples will use
the current `direction`, `provider`, `validation`, and containment syntax.

### Specifications

The language specification will document `cluster` and `namespace` alongside
`account`, `region`, `vpc`, and `subnet`. It will keep grammar behavior separate
from provider validation and remove AWS-specific parser claims.

The public API specification will match the current core exports, preparation
pipeline, rendering options, cancellation behavior, diagnostics, icon registry,
and browser mounting API.

The layout and rendering specification will replace the obsolete AWS-only icon
section with the current provider-neutral flow: bundled icons first, sanitized
runtime registries second, and the generic fallback last. It will cover AWS,
Google Cloud, and Kubernetes scopes and acceptance scenarios.

The playground specification will document provider-grouped examples, the five
Kubernetes scenarios, Monaco support, progressive icon hydration, status
messages, persistence, export, and current responsive behavior.

Each provider specification will use one structure:

1. Provider identity and catalog contract
2. Containment model
3. Icon sources and runtime behavior
4. Semantic rules and validation modes
5. Examples
6. Verification requirements

The pages will distinguish catalog coverage from semantic-rule coverage.

### Guides

The relationship guide will explain syntax and semantics once, then show concise
AWS, Google Cloud, and Kubernetes examples. It will remove repeated prose and
claims that provider rules do not support.

The dynamic icon guide will match the prepare, load, render, caching,
sanitization, fallback, and progressive browser behavior. It will name all three
provider CDN definitions.

The MCP guide will document AWS, Google Cloud, and Kubernetes across health,
rendering, validation, catalog queries, prompts, and example resources. It will
replace the obsolete two-provider response, catalog total, and containment list.

### Architecture and contribution

The system architecture page will describe package boundaries, application
consumers, runtime icon adapters, the preparation pipeline, and Kubernetes scope
extensions.

The contribution guide will use provider-neutral workflows for catalog entries,
icons, rules, tests, and provider packages. Each workflow will include a compact
AWS, Google Cloud, and Kubernetes example or mapping. The guide will preserve
provider-specific details only when upstream artwork or containment rules differ.

### Errors

The hand-written error overview will explain diagnostic stages, severity,
validation modes, partial results, remediation, and generated references. It
will link readers to the generated index without duplicating registry content.

## Documentation Maintenance Policy

`AGENTS.md` will require contributors and agents to update documentation in the
same change when they alter:

- public APIs or package exports;
- language syntax, directives, scopes, or recovery;
- provider catalogs, aliases, icons, rules, or validation behavior;
- playground features or user workflows;
- MCP tools, schemas, resources, endpoints, or examples;
- commands, environment variables, or deployment requirements;
- diagnostic registries or remediation text.

The policy will identify `docs/` Markdown as the source for symlinked
`apps/docs` routes and MCP documentation resources. It will require
`pnpm generate-docs` for diagnostic changes, `pnpm build:docs` for rendered
documentation, and `pnpm verify:sites` for deployed entry points.

## Writing Rules

The rewrite will:

- address readers directly when instructions need a subject;
- use active voice and concrete product names;
- remove filler, rhetorical setups, vague claims, and emphasis crutches;
- avoid passive constructions, em dashes, dramatic fragments, and fake quotes;
- use short paragraphs, varied sentence length, tables for exact mappings, and
  code blocks for copyable commands;
- state limits and incomplete coverage without promotional language.

## Verification

The implementation will:

1. Search published pages for retired directives, stale two-provider claims,
   removed files, obsolete catalog totals, and false icon behavior.
2. Run `pnpm generate-docs` and confirm that generated error pages remain
   deterministic.
3. Run `pnpm build:docs` and confirm that Nextra exports each route.
4. Run `pnpm verify:sites` for the deployed landing, playground, and docs sites.
5. Run relevant MCP, parser, provider, playground, and documentation tests.
6. Run the full repository test suite before handoff.
7. Inspect the final diff and confirm that generated outputs contain only
   expected changes.

## Success Criteria

- Each published page describes the current three-provider product.
- Each code sample uses current syntax and public exports.
- The contribution guide gives one provider-neutral workflow with concrete AWS,
  Google Cloud, and Kubernetes examples.
- The docs contain no broken links to removed roadmap or release files.
- Generated diagnostic pages remain generator-owned.
- `AGENTS.md` requires future changes to keep the docs current.
- Docs generation, docs build, site verification, relevant tests, and the full
  repository suite pass.
