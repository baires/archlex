# ArchLex Documentation

ArchLex compiles text architecture definitions into accessible SVG diagrams. You can model AWS, Google Cloud, and Kubernetes resources with one language and one TypeScript API.

## Start Here

1. Follow the [Getting Started guide](../apps/docs/pages/getting-started.mdx) to install ArchLex, register providers, and render your first diagram.
2. Use the [Language Specification](specs/language.md) when you write directives, resources, scopes, and relationships.
3. Check the provider specification for the resources and semantic rules that ArchLex applies:
   - [AWS](specs/aws-semantics.md)
   - [Google Cloud](specs/gcp-semantics.md)
   - [Kubernetes](specs/k8s-semantics.md)
4. Read the [Error Reference](errors/README.md) when a diagnostic needs more context.

## Build With ArchLex

- [Public API](specs/public-api.md): create an instance, inspect the catalog, prepare icons, and render SVG.
- [Relationship Types](guides/relationship-types.md): express data flow, traffic, dependencies, and custom relationships.
- [Dynamic Icons](guides/dynamic-cdn-icons.md): load provider icons in browsers and Node.js.
- [MCP Server](guides/mcp-server.md): expose rendering, validation, catalog search, and examples to MCP clients.
- [Playground](specs/playground.md): understand the editor, examples, icon hydration, and export flow.

## Understand the System

- [System Architecture](architecture/system-architecture.md): follow source through parsing, validation, layout, icon loading, and SVG rendering.
- [Layout and Rendering](specs/layout-rendering.md): inspect ELK layout, caching, SVG output, and accessibility behavior.
- [Contribution Guide](architecture/contribution-guide.md): add resources, rules, icons, providers, tests, and docs.

## Documentation Ownership

The published docs app reads the specifications, guides, architecture pages, and error reference from this directory through links under `apps/docs/pages/`. Edit the source page here instead of copying its content into the app.

Run these checks after a documentation change:

```bash
pnpm generate-docs
pnpm build:docs
pnpm verify:sites
```

`pnpm generate-docs` owns `errors/index.md` and the generated `errors/AL-*.md` pages. Update diagnostic registries or the generator when those pages need different content.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the repository workflow.
