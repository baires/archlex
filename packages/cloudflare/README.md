# @archlex/cloudflare

Development scaffold for ArchLex's planned Cloudflare provider. This package
currently exports an empty module: it has no provider factory, catalog, semantic
rules, or bundled artwork. It does not yet enable Cloudflare diagrams.

The package uses the existing strict TypeScript, Vite, and pnpm workspace setup.
Its software is MIT licensed; that license does not cover future upstream
Cloudflare artwork.

From the repository root:

```bash
pnpm --filter @archlex/cloudflare build
pnpm --filter @archlex/cloudflare typecheck
pnpm --filter @archlex/cloudflare test
```

The test command currently has no package-specific tests. Resource behavior and
its tests will arrive with the first catalog slice.

Follow-up work: [official artwork clearance](https://github.com/baires/archlex/issues/93),
[artwork importer](https://github.com/baires/archlex/issues/73), and
[first resource slice](https://github.com/baires/archlex/issues/74).

No artwork is bundled until its distribution basis is established. Build and
import perform no network requests.
