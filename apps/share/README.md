# @archlex/share

Cloudflare Worker that stores an `.arch` source in D1 and serves a short playground link plus SVG and PNG URLs. Playground stays a static Pages app. This app is not a Pages site.

Saving identical source reuses its existing share id and refreshes its expiry. Changed source creates a separate share. A SHA-256 fingerprint index keeps this lookup small and prevents duplicate source rows.

The Worker caps source bodies at 400,000 bytes before parsing, limits public clients to 30 POSTs per IP per hour, and allows at most 1,000 POSTs or 10 MiB of submitted source bytes per UTC day across all clients. These daily limits also apply to service-token calls. Cloudflare edge bindings additionally limit POST bursts to 10 requests per minute and image-render bursts to 30 requests per minute per client IP. Rendered SVG/PNG responses are cached for no longer than the share's remaining lifetime.

## Local

```bash
pnpm dev:share
pnpm dev:playground
```

`wrangler dev` reads `apps/share/.dev.vars` and points share links at `http://localhost:5173`. That file is for local overrides only. Do not put secrets in it, in `wrangler.json`, or in git.

The playground dev server proxies `/v1` and `/s/` to `http://127.0.0.1:8787`.

Apply local migrations after the D1 binding changes:

```bash
pnpm --filter @archlex/share exec wrangler d1 migrations apply archlex-share --local
```