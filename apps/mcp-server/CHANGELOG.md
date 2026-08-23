# @archlex/mcp-server

## 0.2.0

### Minor Changes

- feat(mcp-server): implement MCP specification revision `2026-07-28` compliance.
  - Implement modern stateless Streamable HTTP transport on `POST /mcp` with mandatory mirrored header and metadata validation (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`).
  - Add unified modern result envelopes (`resultType: "complete"` and `resultType: "input_required"`) with server identity metadata.
  - Implement `server/discover` capability discovery, stable opaque cursor pagination, and response cache hints (`ttlMs`, `cacheScope`).
  - Implement request-scoped subscriptions (`subscriptions/listen`) and progress streaming (`_meta.progressToken`).
  - Add resource templates (`archlex://docs/{+path}`, `archlex://examples/{name}`) and prompt argument/template variable completion.
  - Preserve backward compatibility for legacy clients (`2025-03-26` / HTTP+SSE) behind an isolated legacy boundary.

- feat(mcp-server): add stateless URL delivery for rendered diagrams.
  - Add `GET /renders/:token.png` endpoint for public stateless PNG delivery with encrypted tokens.
  - Implement AES-256-GCM encryption with gzip compression for render tokens.
  - Add `RENDER_URL_SECRET`, `RENDER_URL_TTL_SECONDS`, and `RENDER_URL_MAX_LENGTH` environment variables.
  - Tool results include `image_delivery: "url"` with `image_url`, `image_width`, `image_height`, `alt_text`, `image_mime_type`, and `image_expires_at` when URL delivery succeeds.
  - Falls back to embedded base64 PNG delivery (`image_delivery: "embedded"`) when token size exceeds limits or URL delivery is unconfigured.
  - Add MCP `resource_link` and Markdown image syntax in content for clients supporting those capabilities.
  - Failed renders (with diagnostics errors) suppress URL delivery and set top-level `isError: true`.
  - Default `RENDER_URL_TTL_SECONDS` is `600`. Set `RENDER_URL_SECRET` with `wrangler secret put`.

- feat(mcp-server): enhance diagnostic hints and MCP Apps viewer compatibility.
  - Preserve `remediation` field from parser diagnostics and expose as both `remediation` and `hint` for compatibility.
  - Always advertise `ui://archlex/diagram-viewer` metadata for forward compatibility regardless of `ENABLE_MCP_APPS` setting.
  - Update diagram viewer to accept both SVG (from `structuredContent.svg`) and PNG (from `content[].type === "image"`) for graceful degradation.
  - Add comprehensive test coverage for URL delivery, diagnostic preservation, and viewer fallback scenarios.

## 0.1.10

### Patch Changes

- Updated dependencies [44cab3b]
  - @archlex/layout-elk@0.2.7

## 0.1.9

### Patch Changes

- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
  - @archlex/aws@0.4.0
  - @archlex/gcp@0.4.0
  - @archlex/k8s@0.4.0
  - @archlex/model@0.6.0
  - @archlex/core@0.5.0
  - @archlex/layout-elk@0.2.6

## 0.1.9

### Patch Changes

- fix(mcp-server): remove SVG source from structuredContent to avoid large payloads in client displays. The rendered image remains available as a base64-encoded content item.

## 0.1.8

### Patch Changes

- Updated dependencies [f53538f]
  - @archlex/model@0.5.0
  - @archlex/core@0.4.0
  - @archlex/aws@0.3.0
  - @archlex/gcp@0.3.0
  - @archlex/k8s@0.3.0
  - @archlex/layout-elk@0.2.5

## 0.1.7

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/k8s@0.2.0
  - @archlex/model@0.4.0
  - @archlex/core@0.3.2
  - @archlex/aws@0.2.3
  - @archlex/gcp@0.2.4
  - @archlex/layout-elk@0.2.4

## 0.1.6

### Patch Changes

- @archlex/core@0.3.1

## 0.1.5

### Patch Changes

- Updated dependencies [8eb714b]
  - @archlex/gcp@0.2.3

## 0.1.4

### Patch Changes

- Updated dependencies [12dd3ec]
  - @archlex/model@0.3.0
  - @archlex/core@0.3.0
  - @archlex/aws@0.2.2
  - @archlex/gcp@0.2.2
  - @archlex/layout-elk@0.2.3

## 0.1.3

### Patch Changes

- Updated dependencies [9edbf6a]
  - @archlex/layout-elk@0.2.2

## 0.1.2

### Patch Changes

- Updated dependencies [69fac46]
  - @archlex/aws@0.2.1
  - @archlex/core@0.2.1
  - @archlex/gcp@0.2.1
  - @archlex/layout-elk@0.2.1
  - @archlex/model@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [fa3c5af]
- Updated dependencies [ced0859]
- Updated dependencies [8fcbb08]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
  - @archlex/core@0.2.0
  - @archlex/aws@0.2.0
  - @archlex/gcp@0.2.0
  - @archlex/model@0.2.0
  - @archlex/layout-elk@0.2.0
