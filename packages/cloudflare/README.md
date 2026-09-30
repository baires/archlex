# @archlex/cloudflare

Cloudflare provider for ArchLex. `cloudflareProvider()` recognizes Workers
(`workers` and `cloudflare.workers`) and can be injected into `createArchLex`.
Official artwork is not bundled; distribution and presentation remain blocked.

The package uses the existing strict TypeScript, Vite, and pnpm workspace setup.
Its software is MIT licensed; that license does not cover future upstream
Cloudflare artwork.

From the repository root:

```bash
pnpm --filter @archlex/cloudflare build
pnpm --filter @archlex/cloudflare typecheck
pnpm --filter @archlex/cloudflare test
```

Workers recognition is covered by `src/index.test.ts`. Rendering uses explicit
provider injection and does not fetch artwork.

Follow-up work: [official artwork clearance](https://github.com/baires/archlex/issues/93),
[SVG fill rules](https://github.com/baires/archlex/issues/95),
[theme presentation](https://github.com/baires/archlex/issues/96), and
[artwork importer](https://github.com/baires/archlex/issues/73).

No artwork is bundled until those gates are cleared. Build and import perform
no network requests.
