# @archlex/cloudflare

Cloudflare product catalog and official SVG artwork for ArchLex. Register
`cloudflareProvider()` with `createArchLex` to author Cloudflare-only diagrams or
use qualified resources such as `cloudflare.workers` alongside AWS, Google Cloud,
and Kubernetes resources. These resources provide recognition and artwork;
product-specific networking validation is separate work.

Resources can appear at the root or within an `account` scope. Icons are bundled,
so rendering and package imports require no network requests. The same original
glyph is presented on a white backing in both themes, with its original viewBox,
path geometry, and colors preserved.

## Commands

From the repository root:

```bash
pnpm --filter @archlex/cloudflare build
pnpm --filter @archlex/cloudflare typecheck
pnpm --filter @archlex/cloudflare test
pnpm --filter @archlex/cloudflare icons:generate
pnpm --filter @archlex/cloudflare icons:check
pnpm validate:catalog
```

Generation consumes local revision-pinned SVG inputs. It verifies source hashes,
rejects unsafe SVG and unmapped assets, and writes deterministic fragments.
`icons:check` reports drift without rewriting. An upstream revision update is a
separate reviewed source-sync operation; ordinary generation does not download.

## Artwork and licenses

Source: Cloudflare, Inc. and contributors to the [Cloudflare documentation icon
repository](https://github.com/cloudflare/cloudflare-docs/tree/48f601bf4293fa9032505f858656d0db5b559131/src/icons),
pinned to `48f601bf4293fa9032505f858656d0db5b559131`.

Software is MIT licensed (`LICENSE`). Artwork is CC BY 4.0 (`LICENSE-ARTWORK`),
with attribution, source references, and modifications recorded in `NOTICE.md`
and in exported icon descriptions. Sanitization and the white backing are
technical changes. Cloudflare names and trademarks remain with their owners;
this community provider is not endorsed by Cloudflare.

## Resources

Every resource also resolves as `cloudflare.<id>`. Categories reuse the existing
ArchLex catalog: `ai` maps to `ai-ml`, `delivery` to `networking`, `governance` to
`management`, and `observability` to `monitoring`.

| ID | Display name | Category |
| --- | --- | --- |
| `workers` | Workers | compute |
| `ai-gateway` | AI Gateway | ai-ml |
| `ai-search` | AI Search | ai-ml |
| `workers-ai` | Workers AI | ai-ml |
| `agents` | Agents | compute |
| `browser-run` | Browser Run | compute |
| `containers` | Containers | compute |
| `dynamic-workers` | Dynamic Workers | compute |
| `pages` | Pages | compute |
| `sandbox` | Sandbox | compute |
| `workflows` | Workflows | compute |
| `automatic-platform-optimization` | Automatic Platform Optimization | networking |
| `cache` | Cache | networking |
| `client-ip-geolocation` | Client Ip Geolocation | networking |
| `client-side-security` | Client-side Security | networking |
| `google-tag-gateway` | Google Tag Gateway | networking |
| `images` | Images | networking |
| `moq` | Media over QUIC | networking |
| `realtime-kit` | RealtimeKit | networking |
| `realtime-sfu` | Realtime SFU | networking |
| `realtime-turn` | Realtime TURN | networking |
| `stream` | Stream | networking |
| `zaraz` | Zaraz | networking |
| `flagship` | Flagship | management |
| `registrar` | Registrar | management |
| `rules` | Rules | management |
