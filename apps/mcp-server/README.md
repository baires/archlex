# @archlex/mcp-server

Remote Model Context Protocol (MCP) server for ArchLex deployed on Cloudflare Workers (`mcp.archlex.dev`).

## Live Endpoints

- `GET /health` – Health check and auth status
- `GET /info` – Server capability metadata & tool listing
- `GET /sse` – Server-Sent Events stream initialization
- `POST /messages` – JSON-RPC message handler (session & stateless fallback)

## Client Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "archlex": {
      "url": "https://mcp.archlex.dev/sse"
    }
  }
}
```

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
