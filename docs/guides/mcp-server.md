# Remote MCP Server

The ArchLex Model Context Protocol (MCP) server enables Large Language Models (Claude, Cursor, ChatGPT, custom AI agents) to generate, validate, inspect, and render cloud architecture diagrams.

It runs as a high-performance Cloudflare Worker at `mcp.archlex.dev` supporting Server-Sent Events (SSE) and HTTP POST JSON-RPC.

---

## 1. Connecting Your LLM Client

### Claude Desktop Configuration

Add the ArchLex Remote MCP Server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "archlex": {
      "url": "https://mcp.archlex.dev/sse"
    }
  }
}
```

### Local Development Setup

If running the MCP server locally with `pnpm dev:mcp`:

```json
{
  "mcpServers": {
    "archlex-local": {
      "url": "http://localhost:8787/sse"
    }
  }
}
```

---

## 2. Server Endpoints & Testing Verification

The server exposes four main endpoints tested live at `mcp.archlex.dev`:

### Endpoints Overview

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/health` | `GET` | Server health status, provider readiness, and authentication status |
| `/info` | `GET` | MCP server metadata, capability listing, and endpoint URLs |
| `/sse` | `GET` | Server-Sent Events stream initialization for stateful client sessions |
| `/messages` | `POST` | JSON-RPC message dispatcher for active SSE sessions & stateless fallback |

### Testing & Verification Findings

1. **Health Check Discovery (`GET /health`)**:
   Returns HTTP 200 OK with `{"status":"ok","service":"archlex-mcp-server","providers":["aws","gcp"],"auth_enabled":false}` and standard `Access-Control-Allow-Origin: *` headers for fast diagnostic sanity checks without establishing full SSE streams.

2. **Server-Sent Events Connection (`GET /sse`)**:
   Initiates a persistent `text/event-stream` response and immediately dispatches `event: endpoint` payload pointing to `/messages?sessionId=<uuid>`.

3. **Stateless JSON-RPC Fallback (`POST /messages`)**:
   Direct single-request invocation via `POST /messages` without `sessionId` provides a stateless REST-like RPC fallback for CLI scripts and lightweight web clients.

4. **Security & Abuse Protections**:
   Operates in Open Access Mode by default while enforcing payload size limits (512 KB), input string length limits (100k chars), and IP rate limiting.

---

## 3. Available Tools

### `render_diagram`

Parses ArchLex shorthand code, validates cloud provider semantics (AWS & GCP), computes graph layout via ELK, and renders SVG string output along with diagnostic logs and an interactive playground link.

#### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `source` | `string` | **Yes** | ArchLex shorthand text syntax (e.g. `direction LR\nprovider aws\nrds-proxy > rds > ecs`) |
| `theme` | `"light"` \| `"dark"` | No | Rendering color theme (default: `"dark"`) |
| `direction` | `"LR"` \| `"RL"` \| `"TB"` \| `"BT"` | No | Layout direction (default: `"LR"`) |
| `validation` | `"strict"` \| `"normal"` \| `"off"` | No | Provider validation mode |

#### Output Response

```json
{
  "success": true,
  "svg": "<svg ...>",
  "diagnostics": [],
  "playground_url": "https://playground.archlex.dev/?code=...",
  "nodes_count": 3,
  "edges_count": 2
}
```

---

### `validate_diagram`

Lightweight check of ArchLex DSL syntax and cloud semantic rules without generating full SVG output.

---

### `get_cloud_catalog`

Returns the complete, authoritative catalog of **379+ cloud services** across AWS and GCP, along with registered containment scopes (`vpc`, `subnet`, `account`, `region`) and valid edge relationship kinds (`connects`, `writes`, `reads`, `encrypts`, `logs`, etc.).

---

### `generate_playground_url`

Generates a deep-link URL to open and edit any ArchLex diagram interactively in the web playground.

---

## 4. Security, Open Access & Rate Limiting

- **Open Access Default**: No API key or token is required for `mcp.archlex.dev`. Anyone and any LLM client can query tools for free.
- **Optional Enterprise Auth**: Self-hosters can restrict access by configuring `MCP_AUTH_TOKEN` in Worker secrets (`Authorization: Bearer <token>` or `?token=<token>`).
- **IP Rate Limiting**: Enforces a default sliding window of **60 requests per 60 seconds per IP**, returning `429 Too Many Requests` with standard `Retry-After` headers if exceeded.
- **Payload Limits**: Rejects payloads exceeding 512 KB (`413 Payload Too Large`) and source DSL inputs over 100,000 characters.

---

## 5. Resources & Prompts

### Resources

- `archlex://docs/dsl-syntax`: Grammar cheat sheet and syntax reference for LLM context windows.
- `archlex://examples/aws-microservices`: Reference 3-tier AWS architecture example.
- `archlex://examples/gcp-data-pipeline`: Reference GCP Pub/Sub & BigQuery data pipeline.

### System Prompts

- `architect_cloud_infrastructure`: Standard prompt instructing LLMs to output valid ArchLex DSL for specified architecture requirements.
