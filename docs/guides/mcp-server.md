---
title: Remote MCP Server
description: "Connect MCP clients to the remote ArchLex MCP server to render, validate, inspect, and share AWS, Google Cloud, and Kubernetes diagrams."
lastModified: 2026-08-22T14:00:00-03:00
---

# Remote MCP Server

Use the ArchLex MCP server to render, validate, inspect, and share AWS, Google
Cloud, and Kubernetes diagrams from an MCP client.

## Connect

The server uses Streamable HTTP at `https://mcp.archlex.dev/mcp`.

### Codex

```bash
codex mcp add archlex --url https://mcp.archlex.dev/mcp
```

### Claude Code

```bash
claude mcp add --transport http archlex https://mcp.archlex.dev/mcp
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

A healthy server reports `aws`, `gcp`, and `k8s` in its provider list.

## Tools

### `render_diagram`

Pass ArchLex source plus optional `theme`, `direction`, `validation`, and
`format` values. The server returns the rendered diagram, diagnostics, node and
edge counts, and a playground URL.

`format` defaults to `"png"` (base64 PNG image block). Use `"svg"` to skip
rasterization and receive raw SVG text instead — intended for text-only or CLI
clients that save the result to a `.svg` file and view it with their own
tooling.

Successful PNG results keep the embedded image as `content[0]`. When
`RENDER_URL_SECRET` is configured and the encrypted token fits
`RENDER_URL_MAX_LENGTH`, the result also includes a `resource_link`, Markdown
image syntax, and `structuredContent.image_delivery: "url"` with `image_url`.
Otherwise the result reports `image_delivery: "embedded"` and
`image_url_fallback_reason` (`render_url_unconfigured` or `source_too_large`).
Failed renders set top-level `isError: true` and never publish a URL.

```json
{
  "source": "provider k8s\ncluster prod { namespace web { service > deployment } }",
  "theme": "dark",
  "validation": "normal"
}
```

### `validate_diagram`

Validate source without SVG layout. Pass an optional provider value of `aws`,
`gcp`, or `k8s` when the source does not select one. When the source has parse
errors, the response includes a `hint` field describing the likely fix (for
example, free-form edge text belongs in `->|label|`, not inside `-[kind]->`).

### `get_cloud_catalog`

Query `aws`, `gcp`, `k8s`, or `all`. The response includes current service
metadata, aliases, supported directives, known relationship kinds, and these
scope names: `account`, `region`, `vpc`, `subnet`, `cluster`, and `namespace`.

Query this tool when you need the current catalog instead of relying on a fixed
service count in prompt text.

### `generate_playground_url`

Create a deep link that opens source in the web playground.

## Resources and prompts

The server publishes a DSL reference, generated documentation resources, and
three example resources:

- `archlex://examples/aws-microservices`
- `archlex://examples/gcp-data-pipeline`
- `archlex://examples/k8s-microservices`

The `architect_cloud_infrastructure` prompt accepts `aws`, `gcp`, or `k8s` and
asks the model to return valid ArchLex source.

Modern clients can list the `archlex://docs/{+path}` and
`archlex://examples/{name}` RFC 6570 resource templates. The
`completion/complete` method suggests prompt arguments and template variables;
tool arguments continue to use JSON Schema enums.

When `render_diagram` receives `_meta.progressToken`, it streams monotonic
parsing, validation, icon hydration, layout, and rendering notifications on the
originating POST response before its final tool result.

## Security

The hosted server permits open access unless the deployment configures
`MCP_AUTH_TOKEN`. A protected deployment accepts a bearer token. The Worker
limits payloads, source length, and requests per IP. It rejects untrusted origins
when origin enforcement applies.

Stateless render URLs are optional:

- `RENDER_URL_SECRET`: set with `wrangler secret put RENDER_URL_SECRET`. Never
  store the secret in `wrangler.json`.
- `RENDER_URL_TTL_SECONDS`: token lifetime in seconds (default `600`).
- `RENDER_URL_MAX_LENGTH`: maximum complete URL length (default `7500`).

Public `GET /renders/:token.png` bypasses bearer auth and Origin checks, but
keeps rate limiting, expiry, and authenticated encryption. Without
`RENDER_URL_SECRET`, rendering stays embedded-only.

Do not place secrets inside architecture source or URLs.

## Local development

```bash
pnpm dev:mcp
```

Connect a client to `http://localhost:8787/mcp`. Run MCP tests with:

```bash
pnpm --filter @archlex/mcp-server test
pnpm build:mcp
```

The build embeds current hand-written `docs/` pages as MCP resources. Run it
after documentation changes that affect those resources.
