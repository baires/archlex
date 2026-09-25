# @archlex/share

Cloudflare Worker that stores an `.arch` source in D1 and serves a short playground link plus SVG and PNG URLs. Playground stays a static Pages app. This app is not a Pages site.

Every create request inserts an independent share, including identical source. Each response includes a one-time revoke token; only its SHA-256 hash is stored. The token cannot be recovered later, and shares created before revoke tokens were introduced cannot be revoked. Anyone with a share link can view the full source, so keep confidential diagrams out of shares.

The Worker caps source bodies at 400,000 bytes and diagrams at 2,000 lines, 200 nodes, and 400 edges. Invalid diagrams are rejected before they are stored. Public clients are limited to 30 POSTs per IP per hour and 200 POSTs or 2 MiB of source bytes per IP per UTC day. Authenticated service calls use a separate 120 requests per minute edge limiter, plus 30 POSTs per caller per hour, 200 POSTs or 2 MiB per caller per UTC day, and a shared service ceiling of 5,000 posts or 50 MiB per UTC day. A global circuit breaker allows at most 20,000 POSTs or 200 MiB of source bytes per UTC day. Cloudflare edge bindings additionally limit public POST bursts to 10 requests per minute, image-render bursts to 30 requests per minute per client IP, and uncached image renders to 300 requests per minute globally. The Worker caches SVG and PNG by path only for at most 24 hours and never beyond the share's remaining lifetime; query strings do not create separate cache entries. Image responses sent to clients use `Cache-Control: no-store` so revocation reaches the Worker.

Set `SHARE_SERVICE_TOKEN` with `wrangler secret put SHARE_SERVICE_TOKEN` on the share and MCP Workers. Do not put it in `wrangler.json`, `.dev.vars`, or the client bundle. Keep the Worker origin behind Cloudflare: `CF-Connecting-IP` is a trusted client address only when Cloudflare supplies the request header. A direct origin request can supply a spoofed value.

## Local

```bash
pnpm dev:share
pnpm dev:playground
```

`wrangler dev` reads `apps/share/.dev.vars` and points share links at `http://localhost:5173`. That file may contain origin settings only. Do not put secrets in it, in `wrangler.json`, or in git. Run `pnpm check:share-secrets` to scan the repo and local `.dev.vars` files.

The playground dev server proxies `/v1` and `/s/` to `http://127.0.0.1:8787`.

Apply local migrations after the D1 binding changes:

```bash
pnpm --filter @archlex/share exec wrangler d1 migrations apply archlex-share --local
```
