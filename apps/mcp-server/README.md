# @archlex/mcp-server

Remote Model Context Protocol (MCP) server for ArchLex deployed on Cloudflare Workers (`mcp.archlex.dev`).

## Live Endpoints

- `GET|POST|DELETE /mcp` – Streamable HTTP transport (recommended)
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

- `render_diagram({ source, theme, direction, validation })` – Renders SVG diagram and playground URL.
- `validate_diagram({ source, provider, validation })` – Fast syntax & semantic validation.
- `get_cloud_catalog({ provider })` – Service catalog (AWS, GCP) and containment rules.
- `generate_playground_url({ source })` – Deep-link URL to `playground.archlex.dev`.

## Security & Environment Variables

Open access by default. Configure Worker environment variables for private deployments:

- `MCP_AUTH_TOKEN` (optional): Secret key required via `Authorization: Bearer <token>` or `?token=<token>`.
- `ALLOWED_ORIGINS` (optional): Comma-separated CORS allowed origins list.
- `RATE_LIMIT_MAX_REQUESTS` (optional): Max requests per 60s per IP (default: `60`).

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
