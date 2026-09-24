# @archlex/mcp-server

Remote Model Context Protocol (MCP) server for ArchLex deployed on Cloudflare Workers (`mcp.archlex.dev`), compliant with MCP specification revision `2026-07-28`.

## Live Endpoints

- `POST /mcp` – Stateless modern Streamable HTTP transport (recommended; GET and DELETE return HTTP 405 Method Not Allowed).
- `GET /health` – Server health, supported cloud providers (`aws`, `gcp`, `k8s`), and auth status.
- `GET /info` – Server metadata, endpoint URLs, and tool listing.
- `GET /sse` – **Deprecated** legacy Server-Sent Events stream initialization (isolated backward compatibility route; slated for removal in a future major release).
- `POST /messages` – **Deprecated** legacy JSON-RPC message handler for session-based clients.

## MCP 2026-07-28 Protocol Specifications

The server implements the mandatory base protocol and advertised capabilities under revision `2026-07-28`:

### Stateless Streamable HTTP Transport (`/mcp`)
- Modern requests do not use sessions, session cookies, or `Mcp-Session-Id`. Every request is standalone and independently authenticated and routed.
- Every modern JSON-RPC request POST validates mirrored HTTP headers matching body metadata:
  - `MCP-Protocol-Version`: Exactly `2026-07-28`
  - `Mcp-Method`: Exact JSON-RPC method name (e.g. `tools/call`, `resources/read`, `server/discover`)
  - `Mcp-Name`: Tool name for `tools/call`, URI for `resources/read`, or prompt name for `prompts/get`
  - `Accept`: Must negotiate both `application/json` and `text/event-stream`
- Responses are delivered as a single JSON object or as a request-scoped SSE stream (for progress notifications or subscriptions). Accepted notifications return HTTP 202 with an empty body.

### Request Metadata (`_meta`)
Every modern JSON-RPC request MUST supply the following in `params._meta`:
- `io.modelcontextprotocol/protocolVersion`: `"2026-07-28"`
- `io.modelcontextprotocol/clientCapabilities`: Declared client capability object (e.g. `{}`)
- `io.modelcontextprotocol/clientInfo` (optional): Informational client name and version
- `progressToken` (optional): Token to enable request-scoped progress streaming

### Result Envelopes, Caching & Pagination
- All successful modern responses include `resultType: "complete"` or `resultType: "input_required"` and server identity in `_meta["io.modelcontextprotocol/serverInfo"]`.
- Cacheable operations (`server/discover`, `tools/list`, `resources/list`, `resources/read`, `resources/templates/list`, `prompts/list`) publish explicit cache hints (`ttlMs: 3600000`, `cacheScope: "public"`).
- List endpoints support deterministic ordering and pagination using opaque stable `cursor` tokens.

### Migration Guidance from Legacy Clients
Legacy clients that send `initialize` without per-request metadata continue to work through the isolated legacy adapter (`2025-03-26`). To migrate:
1. Send JSON-RPC requests directly to `POST /mcp` without calling `initialize`.
2. Include `MCP-Protocol-Version: 2026-07-28`, `Mcp-Method`, and applicable `Mcp-Name` headers.
3. Include `_meta["io.modelcontextprotocol/protocolVersion"] = "2026-07-28"` and `_meta["io.modelcontextprotocol/clientCapabilities"]` in `params`.
4. Handle the unified `resultType: "complete"` envelope.

## Client Configuration

The recommended endpoint is the Streamable HTTP transport at `https://mcp.archlex.dev/mcp`. The legacy `/sse` and `/messages` routes remain available for older clients.

### Claude Code

```bash
claude mcp add --transport http archlex https://mcp.archlex.dev/mcp
```

### Codex

```bash
codex mcp add archlex --url https://mcp.archlex.dev/mcp
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
- `generate_playground_url({ source })` – Creates a share and returns its playground link when the share service is configured, otherwise a source-encoded deep link.

Share creation returns a one-time `revoke_token` in `structuredContent` only;
it is omitted from preview text, Markdown, and resource links. Save it when
returned because it cannot be recovered later. Existing shares created before
revoke tokens were introduced cannot be revoked. Anyone with a share link can
view the full diagram source, so do not include confidential content.

## Modern Protocol Features

- `render_diagram` emits five monotonic request-scoped progress notifications when the request includes `_meta.progressToken`. They arrive on the originating POST response stream before the final result.
- `resources/templates/list` publishes `archlex://docs/{+path}` and `archlex://examples/{name}` with pagination and public cache hints.
- `completion/complete` suggests declared prompt arguments and published resource-template variables. Tool arguments use their JSON Schema enums and are not completion targets.
- Tool definitions include read-only/idempotency hints and a bounded PNG icon. Synced documentation resources include version-control-derived `lastModified` annotations; static resources remain valid without presentation metadata.
- Subscriptions (`subscriptions/listen`) support request-scoped long-lived streams with initial acknowledgment and keep-alives. Note that ArchLex diagrams do not use deprecated MCP Logging or fake list-change events.

## Rendering Modes

The `render_diagram` tool supports two rendering paths:

### Direct Rendering Path (Default)

**Current implementation** — works with MCP clients that support base64 PNG images.

- Returns a base64-encoded PNG image in `content[0]`
- Returns a text summary and the exact final ArchLex source in `content[1]`
- Provides metadata in `structuredContent` for programmatic access (diagnostics, playground URL, node/edge counts)
- Includes SVG source in `structuredContent` only when MCP Apps is enabled or `format: "svg"` is requested
- With `format: "svg"`, returns SVG text in `content` instead of the PNG block and skips rasterization entirely — intended for CLI agents (Kimi Code, Codex, etc.) that save the result to a `.svg` file and view it with their own file tooling
- Hydrates provider icons from the same pinned CDN catalogs used by the playground, with generic fallbacks when an icon cannot be fetched
- Falls back to the base diagram when icon hydration exceeds 1.5 seconds
- Bounds PNG output to 4,096 pixels per side and 4 million total pixels
- Bundles Inter under the SIL Open Font License so labels render consistently in Workers
- Agents display the embedded image inline when the client supports base64 PNG images

### URL Delivery (Optional)

When `RENDER_URL_SECRET` is configured, the server adds a short-lived HTTPS URL in addition to the embedded base64 PNG image:

- The existing `content[0]` image block remains the primary MCP image
- The tool result includes `image_delivery: "url"` in `structuredContent` when a URL was generated
- The URL is a stateless encrypted token encoding the diagram source and expires after `RENDER_URL_TTL_SECONDS` (default `600`)
- The result includes `image_url`, `image_width`, `image_height`, `alt_text`, `image_mime_type`, and `image_expires_at`
- A `resource_link` block is added to `content[]` for clients that support MCP resource links
- Markdown-formatted image syntax is included in the text content for clients that render Markdown
- Falls back to embedded base64 PNG delivery (`image_delivery: "embedded"`) when the encrypted token would exceed `RENDER_URL_MAX_LENGTH` or URL delivery is unconfigured
- The embedded fallback reason is reported in `image_url_fallback_reason` (e.g., `"source_too_large"`, `"render_url_unconfigured"`)
- Failed renders (diagnostics with errors) never generate URLs and set top-level `isError: true`

**URL delivery configuration:**

- `RENDER_URL_SECRET`: high-entropy secret for AES-256-GCM encryption. Set with `wrangler secret put RENDER_URL_SECRET`. Never put the secret in `wrangler.json`.
- `RENDER_URL_TTL_SECONDS` (optional): token lifetime in seconds. Defaults to `600`.
- `RENDER_URL_MAX_LENGTH` (optional): maximum complete URL length. Defaults to `7500`.
- `SHARE_ORIGIN`: share Worker origin. Production default is `https://share.archlex.dev`. Local `wrangler dev` can override it in `.dev.vars`.
- `SHARE_SERVICE_TOKEN`: shared secret so this server can create shares without the public rate limit. Set with `wrangler secret put SHARE_SERVICE_TOKEN`. Never commit it.

**When to use URL delivery:**

- Clients that render Markdown images from `https://` URLs
- Clients that support MCP resource links
- Reducing message payload size for large diagrams
- Enabling diagram persistence beyond the conversation context

**When embedded delivery is preferred:**

- Clients without Markdown or resource link support
- Use cases requiring guaranteed inline rendering
- Diagrams that must persist indefinitely in the conversation history

### Interactive Rendering Path (Opt-in)

**Future-ready** — requires MCP Apps (SEP-1865) support in the client.

- Always declares `_meta.ui.resourceUri: "ui://archlex/diagram-viewer"` in the tool definition for forward compatibility
- Clients supporting MCP Apps can load the interactive viewer iframe
- Provides interactive diagram exploration (pan, zoom, node inspection)
- The viewer degrades gracefully: accepts SVG from `structuredContent.svg` or PNG from `content[].type === "image"`

Enable this mode via the `ENABLE_MCP_APPS` environment variable when your MCP client supports it. The Direct Rendering Path remains the fallback for all clients.

### Migration Path

When MCP Apps support arrives in your client:

1. Set `ENABLE_MCP_APPS=true` in your Worker environment variables
2. Redeploy the Worker
3. The tool will include SVG in `structuredContent` for the interactive viewer
4. Clients supporting MCP Apps will use the interactive viewer; others will continue using the Direct Rendering Path

## Client Compatibility

| Client | Base64 PNG Images | MCP Resource Links | Markdown URLs | MCP Apps |
|--------|-------------------|--------------------|--------------|----|
| Claude Desktop | ✅ | ⏳ Depends on version | ⏳ Depends on version | ⏳ Coming soon |
| Claude Code | ✅ | ⏳ Depends on version | ⏳ Depends on version | ⏳ Coming soon |
| Codex | ✅ | ⏳ Depends on version | ⏳ Depends on version | ⏳ Coming soon |
| Cursor | ✅ | ⏳ Depends on version | ⏳ Depends on version | ⏳ Coming soon |
| Generic MCP clients | ✅ Depends on client | ⏳ Depends on client | ⏳ Depends on client | ⏳ Depends on client |

**Base64 PNG Images**: Widely supported across MCP clients. The primary delivery method for embedded diagrams.

**MCP Resource Links**: Clients that support the MCP resource link specification can fetch diagrams from `image_url` via the resource protocol.

**Markdown URLs**: Clients that render Markdown image syntax can display diagrams from `![alt](image_url)` in the text content.

**MCP Apps**: Interactive viewer support via the MCP Apps extension (SEP-1865). The viewer metadata is always advertised for forward compatibility and will degrade to PNG when SVG is unavailable.

## Security & Environment Variables

Open access by default. Configure Worker environment variables for private deployments:

- `MCP_AUTH_TOKEN` (optional): High-entropy secret required via `Authorization: Bearer <token>` only (maximum 8192 characters). Query-string credentials are rejected. Verification uses constant-time comparison of fixed-size SHA-256 digests.
- `ALLOWED_ORIGINS` (optional): Comma-separated allowed origins list. Defaults to unrestricted access; configure explicitly for private or local deployments. Requests without an Origin header remain supported.
- `RATE_LIMIT_MAX_REQUESTS` (optional): Fallback limiter requests per window per IP (default: `60`, maximum `1000`).
- `RATE_LIMIT_WINDOW_SECONDS` (optional): Fallback limiter window (default: `60`, maximum `3600`). Invalid limit settings use the defaults. A native `RATE_LIMITER` binding uses its own configured quota.
- `MCP_REQUEST_TIMEOUT_MS` (optional): Deadline for modern non-subscription requests and public render URL work (default: `30000`).
- `MCP_MAX_REQUEST_TIMEOUT_MS` (optional): Deployment-specific timeout ceiling, capped at `120000` milliseconds (default: `120000`).
- `ENABLE_MCP_APPS` (optional): Enable MCP Apps interactive viewer SVG inclusion (default: `false`). Set to `true` when your MCP client supports the MCP Apps extension (SEP-1865). The viewer metadata is always advertised for forward compatibility.
- `RENDER_URL_SECRET` (optional): High-entropy secret for stateless URL delivery encryption (AES-256-GCM). Set with `wrangler secret put RENDER_URL_SECRET`.
- `RENDER_URL_TTL_SECONDS` (optional): Stateless URL token lifetime in seconds. Defaults to `600`.
- `RENDER_URL_MAX_LENGTH` (optional): Maximum complete URL length in characters. Defaults to `7500`. URLs exceeding this length fall back to embedded delivery.

POST bodies are limited to 512 KiB of actual bytes, including streamed requests without `Content-Length`. The fallback limiter retains at most 10,000 IP entries per isolate and expires inactive entries; when full, new IPs are rejected without resetting live quotas.

Legacy SSE sessions close on disconnect, cancellation, or after five minutes. Each isolate admits at most 100 active sessions; clients must reconnect after expiry. Public image rendering admits at most four concurrent renders per isolate. Capacity exhaustion returns `503` with `Retry-After`; canceled render work retains its slot until it settles. These local limits supplement the platform's deployment-wide controls.

The MCP Apps viewer accepts messages only from its parent window, displays SVG in passive image context, and permits playground links only to `https://playground.archlex.dev`.

Render URLs are bearer capabilities: anyone holding a URL can retrieve its image without `MCP_AUTH_TOKEN` until expiry, and responses allow public caching for the remaining lifetime. Use embedded image delivery when that sharing model is unsuitable. Playground links encode the diagram source.

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
