---
title: Remote MCP Server
description: "Connect MCP clients to the remote ArchLex MCP server to render, validate, inspect, and share AWS, Cloudflare, Google Cloud, and Kubernetes diagrams."
lastModified: 2026-10-03T13:00:00-03:00
---

# Remote MCP Server

Use the ArchLex MCP server to render, validate, inspect, and share AWS, Cloudflare, Google
Cloud, and Kubernetes diagrams from an MCP client.

For the 30-second path (skill + one prompt), see
[Use with AI agents](/guides/agents).

## Connect

The server uses Streamable HTTP at `https://mcp.archlex.dev/mcp`.

### Claude Code

```bash
claude mcp add --transport http archlex https://mcp.archlex.dev/mcp
```

### Codex

```bash
codex mcp add archlex --url https://mcp.archlex.dev/mcp
```

### Cursor

```json
{
  "mcpServers": {
    "archlex": {
      "url": "https://mcp.archlex.dev/mcp"
    }
  }
}
```

The server keeps legacy `/sse` and `/messages` routes for clients that cannot
use Streamable HTTP.

## Endpoints

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/mcp` | `POST` | Modern Streamable HTTP transport; GET and DELETE return 405 |
| `/health` | `GET` | Health, providers, and auth status |
| `/info` | `GET` | Server metadata, capabilities, and URLs |
| `/sse` | `GET` | Legacy event stream |
| `/messages` | `POST` | Legacy JSON-RPC dispatch |

A healthy server reports `aws`, `cloudflare`, `gcp`, and `k8s` in its provider list.

## Tools

### `render_diagram`

Pass ArchLex source plus optional `theme`, `direction`, `validation`, and
`format` values. The server returns the rendered diagram, diagnostics, node and
edge counts, and a playground URL.

`format` defaults to `"png"`. Use `"svg"` from text-only or CLI clients that
save the file themselves. Failed renders set `isError: true` and do not publish
a playground URL.

```json
{
  "source": "provider k8s\ncluster prod { namespace web { service > deployment } }",
  "theme": "dark",
  "validation": "normal"
}
```

### `validate_diagram`

Validate source without SVG layout. Pass an optional provider value of `aws`,
`cloudflare`, `gcp`, or `k8s` when the source does not select one. When the source has parse
errors, the response includes a `hint` field describing the likely fix (for
example, free-form edge text belongs in `->|label|`, not inside `-[kind]->`).

### `get_cloud_catalog`

Query `aws`, `cloudflare`, `gcp`, `k8s`, or `all`. The response includes current service
metadata, aliases, supported directives, known relationship kinds, and these
scope names: `account`, `region`, `vpc`, `subnet`, `cluster`, and `namespace`.

Query this tool when you need the current catalog instead of relying on a fixed
service count in prompt text.

### Cloudflare authoring workflow

For an unfamiliar identifier, use a focused lookup:

```json
{"provider": "cloudflare", "query": "workers", "limit": 5}
```

The filtered response contains `matches`, including canonical IDs and aliases;
`workers` is the canonical ID and `cloudflare.workers` is its qualified alias.
An unfiltered `{"provider": "cloudflare"}` lookup returns the complete provider
catalog in `providers.cloudflare.services`. A query can match multiple services;
select the intended canonical ID from the response.

Read `archlex://docs/guides/cloudflare-pack` for the public catalog, scope
semantics, validation limits, and four verified reference architectures. The
[Cloudflare provider guide](/guides/cloudflare-pack) covers standalone Workers/R2,
public AWS origins, GCP/Kubernetes Tunnel connectors, and AWS/GCP origin steering.
These are guide examples, rather than additional `archlex://examples` resources.

Render the standalone reference directly with `render_diagram`:

```json
{
  "source": "provider cloudflare\ndirection LR\naccount cloudflare-production {\n  domain: dns[\"app.example.com\"]\n  entry: workers[\"Application entry\"]\n  protection: waf[\"WAF policy\"]\n  response-cache: cache[\"Response caching\"]\n  objects: r2[\"Application objects\"]\n  domain ->|DNS record selects entry point| entry\n  protection -[protects]-> entry\n  response-cache -[caches]->|Eligible application responses| entry\n  entry -[reads]-> objects\n}",
  "format": "svg",
  "validation": "normal"
}
```

For validation-only work, pass the same source to `validate_diagram` with
`validation` set to `normal`, `strict`, or `off`. When source omits its provider
directive, `{"source": "workers > r2", "provider": "cloudflare", "validation": "strict"}`
selects Cloudflare explicitly. Rendering uses the source's provider directive;
`render_diagram` has no provider override argument.

Keep Cloudflare resources at the document root, inside `account`, or in generic
`group` organization. Explicit native scopes (`region`, `vpc`, `subnet`,
`cluster`, `namespace`) produce a containment warning in normal mode, an error
in strict mode, and no semantic diagnostic in off mode. Qualify native resources
in mixed diagrams, such as `aws.alb`, `gcp.gke`, and `k8s.deployment`.

Validation checks identity and containment. It does not verify deployed DNS,
origin health, Access policies, Tunnel reachability, or load-balancer behavior.
Keep connector establishment and request flows distinct, as in the verified
Tunnel fixture; labels express architecture intent rather than runtime proof.

### `generate_playground_url`

Create a playground URL without rendering. Check `share_status`: `created`
means `url` is a short share link and `svg_url`/`png_url` are available;
`unavailable` means `url` is a source-encoded editable fallback. The one-time
`revoke_token` is returned in `structuredContent` only and should not be shown
to users.

## Resources and prompts

The server publishes a DSL reference, generated documentation resources, and
three example resources:

- `archlex://examples/aws-microservices`
- `archlex://examples/gcp-data-pipeline`
- `archlex://examples/k8s-microservices`

The `architect_cloud_infrastructure` prompt accepts `aws`, `cloudflare`, `gcp`, or `k8s` and
asks the model to return valid ArchLex source.

Modern clients can list the `archlex://docs/{+path}` and
`archlex://examples/{name}` RFC 6570 resource templates. The
`completion/complete` method suggests prompt arguments and template variables;
tool arguments continue to use JSON Schema enums.

When `render_diagram` receives `_meta.progressToken`, it streams monotonic
parsing, validation, icon hydration, layout, and rendering notifications on the
originating POST response before its final tool result.

## Security

`https://mcp.archlex.dev/mcp` is public on purpose. ArchLex is MIT-licensed and
the hosted MCP server does not require an account or API key.

The server only accepts ArchLex source and returns diagrams. It does not
connect to your AWS, Cloudflare, GCP, or Kubernetes accounts, and it does not read your
git remotes.

The public endpoint rate-limits by IP and caps payload and source size. POST
bodies are bounded to 512 KiB, including streamed bodies. Legacy SSE sessions
expire after five minutes and are capped at 100 per isolate. Public image
rendering has a request deadline and a four-render concurrency limit per isolate.

`render_diagram` returns `share_status`. When it is `created`, `playground_url`
is a short `/s/{id}` share URL and the result includes `svg_url` and `png_url`.
When it is `unavailable`, the URL is an editable source-encoded playground
fallback and cannot be revoked. Clients should not describe that fallback as a
share link. Clients that can display images should show the preview; others can
embed the image URL. The one-time `revoke_token` appears only in
`structuredContent`; never include it in user-facing text. Keep secrets out of diagram source
files the same way you would keep them out of any other file you commit. Save
source as `.arch` (the name to use); `.archlex` files remain valid everywhere
ArchLex reads a file. For short, expiring links that render the diagram in a
README, see [Share a diagram](/guides/share).

To run a private copy, see the
[MCP server README](https://github.com/baires/archlex/blob/main/apps/mcp-server/README.md).
Private deployments can set `MCP_AUTH_TOKEN` and `ALLOWED_ORIGINS`. Supply the
token in `Authorization: Bearer <token>`; query-string credentials are rejected.
Optional URL delivery uses
`RENDER_URL_SECRET`, `RENDER_URL_TTL_SECONDS` (default `600`), and
`RENDER_URL_MAX_LENGTH`. When a URL is issued, results include
`image_delivery: "url"`; otherwise they stay embedded. Render URLs allow anyone
holding the link to retrieve the image without authentication until expiry,
with public caching for the remaining lifetime. Choose embedded delivery when
that sharing model is unsuitable.

## Local development

For end-to-end local sharing, set `SHARE_ORIGIN=http://127.0.0.1:8787` in both
`apps/share/.dev.vars` and `apps/mcp-server/.dev.vars`; set
`PLAYGROUND_ORIGIN=http://localhost:5173` in both files. Share publishes URLs on
the Worker origin, and the playground dev server proxies `/v1` and `/s/` to that
Worker. Start Share on port `8787`, Playground on `5173`, then MCP (Wrangler
uses the next available port, typically `8788`). This matches production's
same-origin MCP-to-Share contract while keeping the playground on its own host.

```bash
pnpm dev:mcp
```

Connect a client to the MCP Worker's local port, typically
`http://localhost:8788/mcp` when Share is running alongside it.
