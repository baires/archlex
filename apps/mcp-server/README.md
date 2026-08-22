# @archlex/mcp-server

Remote Model Context Protocol (MCP) server for ArchLex deployed on Cloudflare Workers (`mcp.archlex.dev`).

## Live Endpoints

- `POST /mcp` – Streamable HTTP transport (recommended; modern GET and DELETE return 405)
- `GET /health` – Health check and auth status
- `GET /info` – Server capability metadata & tool listing
- `GET /sse` – Legacy Server-Sent Events stream initialization (kept for backward compatibility)
- `POST /messages` – Legacy JSON-RPC message handler (session & stateless fallback)

## Client Configuration

The recommended endpoint is the Streamable HTTP transport at `https://mcp.archlex.dev/mcp`. The legacy `/sse` and `/messages` routes remain available for older clients.

### Codex

```bash
codex mcp add archlex --url https://mcp.archlex.dev/mcp
```

### Claude Code

```bash
claude mcp add --transport http archlex https://mcp.archlex.dev/mcp
```

### Cursor

Add to `.cursor/mcp.json` (project-scoped):

```json
{
  "mcpServers": {
    "archlex": {
      "url": "https://mcp.archlex.dev/mcp"
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` (project-scoped):

```json
{
  "servers": {
    "archlex": {
      "type": "http",
      "url": "https://mcp.archlex.dev/mcp"
    }
  }
}
```

### Generic MCP clients

Use `https://mcp.archlex.dev/mcp` in any client that supports the remote Streamable HTTP transport.

## Tools

- `render_diagram({ source, theme, direction, validation, format })` – Hydrates provider icons, renders a diagram, returns the final ArchLex source, and provides a playground URL. `format` is `"png"` (default, base64 image block) or `"svg"` (raw SVG text, skips rasterization — use this from text-only/CLI clients and save the SVG to a file).
- `validate_diagram({ source, provider, validation })` – Fast syntax & semantic validation. Responses include a `hint` field when parse errors are detected.
- `get_cloud_catalog({ provider, query, category, limit })` – Service catalog (AWS, GCP, Kubernetes) and containment rules. Supply `query` or `category` for a focused, compact lookup; an unfiltered call returns the full catalog.
- `generate_playground_url({ source })` – Deep-link URL to `playground.archlex.dev`.

## Modern Protocol Features

- `render_diagram` emits five monotonic request-scoped progress notifications when the request includes `_meta.progressToken`. They arrive on the originating POST response stream before the final result.
- `resources/templates/list` publishes `archlex://docs/{+path}` and `archlex://examples/{name}` with pagination and public cache hints.
- `completion/complete` suggests declared prompt arguments and published resource-template variables. Tool arguments use their JSON Schema enums and are not completion targets.
- Tool definitions include read-only/idempotency hints and a bounded PNG icon. Synced documentation resources include version-control-derived `lastModified` annotations; static resources remain valid without presentation metadata.

## Rendering Modes

The `render_diagram` tool supports two rendering paths:

### Direct Rendering Path (Default)

**Current implementation** — works with all MCP clients today.

- Returns a base64-encoded PNG image in `content[0]`
- Returns a text summary and the exact final ArchLex source in `content[1]`
- Provides metadata in `structuredContent` for programmatic access (diagnostics, playground URL, node/edge counts)
- Includes SVG source in `structuredContent` only when MCP Apps is enabled or `format: "svg"` is requested
- With `format: "svg"`, returns SVG text in `content` instead of the PNG block and skips rasterization entirely — intended for CLI agents (Kimi Code, Codex, etc.) that save the result to a `.svg` file and view it with their own file tooling
- Hydrates provider icons from the same pinned CDN catalogs used by the playground, with generic fallbacks when an icon cannot be fetched
- Falls back to the base diagram when icon hydration exceeds 1.5 seconds
- Bounds PNG output to 4,096 pixels per side and 4 million total pixels
- Bundles Inter under the SIL Open Font License so labels render consistently in Workers
- Agents display the embedded image inline without additional client support

This mode prioritizes **universal compatibility** — any MCP client that can display base64 images will show rendered diagrams.

### Interactive Rendering Path (Opt-in)

**Future-ready** — requires MCP Apps (SEP-1865) support in the client.

- Declares `_meta.ui.resourceUri: "ui://archlex/diagram-viewer"` in the tool definition
- Clients supporting MCP Apps can load the interactive viewer iframe
- Provides interactive diagram exploration (pan, zoom, node inspection)

Enable this mode via the `ENABLE_MCP_APPS` environment variable when your MCP client supports it. The Direct Rendering Path remains the fallback for all clients.

### Migration Path

When MCP Apps support arrives in your client:

1. Set `ENABLE_MCP_APPS=true` in your Worker environment variables
2. Redeploy the Worker
3. The tool declaration will include MCP Apps metadata
4. Clients supporting MCP Apps will use the interactive viewer; others will continue using the Direct Rendering Path

## Client Compatibility

| Client | Base64 Images | MCP Apps |
|--------|---------------|----------|
| Claude Desktop | ✅ | ⏳ Coming soon |
| Claude Code | ✅ | ⏳ Coming soon |
| Codex | ✅ | ⏳ Coming soon |
| Cursor | ✅ | ⏳ Coming soon |
| Generic MCP clients | ✅ | ⏳ Depends on client |

**Base64 Images**: All current MCP clients support displaying embedded base64 SVG images inline (Direct Rendering Path).

**MCP Apps**: Interactive viewer support via the MCP Apps extension (SEP-1865). No client has implemented this yet, but when they do, you can enable it via the `ENABLE_MCP_APPS` flag.

## Security & Environment Variables

Open access by default. Configure Worker environment variables for private deployments:

- `MCP_AUTH_TOKEN` (optional): Secret key required via `Authorization: Bearer <token>` or `?token=<token>`.
- `ALLOWED_ORIGINS` (optional): Comma-separated CORS allowed origins list.
- `RATE_LIMIT_MAX_REQUESTS` (optional): Max requests per 60s per IP (default: `60`).
- `MCP_REQUEST_TIMEOUT_MS` (optional): Deadline for modern non-subscription requests (default: `30000`).
- `MCP_MAX_REQUEST_TIMEOUT_MS` (optional): Deployment-specific timeout ceiling, capped at `120000` milliseconds (default: `120000`).
- `ENABLE_MCP_APPS` (optional): Enable MCP Apps interactive viewer metadata (default: `false`). Set to `true` when your MCP client supports the MCP Apps extension (SEP-1865). When disabled, only the Direct Rendering Path is advertised, ensuring compatibility with all current clients.

## Development

```bash
# Sync docs & start local worker
pnpm dev

# Run unit tests
pnpm test

# Typecheck
pnpm typecheck

# Deploy to Cloudflare Workers
pnpm deploy
```
