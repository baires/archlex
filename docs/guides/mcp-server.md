---
title: Remote MCP Server
description: "Connect MCP clients to the remote ArchLex MCP server to render, validate, inspect, and share AWS, Google Cloud, and Kubernetes diagrams."
lastModified: 2026-08-28T22:00:00-03:00
---

# Remote MCP Server

Use the ArchLex MCP server to render, validate, inspect, and share AWS, Google
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

A healthy server reports `aws`, `gcp`, and `k8s` in its provider list.

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

`https://mcp.archlex.dev/mcp` is public on purpose. ArchLex is MIT-licensed and
the hosted MCP server does not require an account or API key.

The server only accepts ArchLex source and returns diagrams. It does not
connect to your AWS, GCP, or Kubernetes accounts, and it does not read your
git remotes.

The public endpoint rate-limits by IP and caps payload and source size.

Playground links encode diagram source. Keep secrets out of `.archlex` files
the same way you would keep them out of any other file you commit.

To run a private copy, see the
[MCP server README](https://github.com/baires/archlex/blob/main/apps/mcp-server/README.md).
Private deployments can set `MCP_AUTH_TOKEN`. Optional URL delivery uses
`RENDER_URL_SECRET`, `RENDER_URL_TTL_SECONDS` (default `600`), and
`RENDER_URL_MAX_LENGTH`. When a URL is issued, results include
`image_delivery: "url"`; otherwise they stay embedded.

## Local development

```bash
pnpm dev:mcp
```

Connect a client to `http://localhost:8787/mcp`.
