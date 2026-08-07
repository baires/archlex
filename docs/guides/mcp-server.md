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

## 2. Available Tools

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

#### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `source` | `string` | **Yes** | ArchLex shorthand text code to validate |
| `provider` | `"aws"` \| `"gcp"` | No | Default cloud provider for validation |
| `validation` | `"strict"` \| `"normal"` \| `"off"` | No | Validation strictness mode |

---

### `get_cloud_catalog`

Returns the complete, authoritative catalog of **379+ cloud services** across AWS and GCP, along with registered containment scopes (`vpc`, `subnet`, `account`, `region`) and valid edge relationship kinds (`connects`, `writes`, `reads`, `encrypts`, `logs`, etc.).

#### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `provider` | `"aws"` \| `"gcp"` \| `"all"` | No | Provider catalog filter (default: `"all"`) |

---

### `generate_playground_url`

Generates a deep-link URL to open and edit any ArchLex diagram interactively in the web playground.

---

## 3. Resources & Prompts

### Resources

- `archlex://docs/dsl-syntax`: Grammar cheat sheet and syntax reference for LLM context windows.
- `archlex://examples/aws-microservices`: Reference 3-tier AWS architecture example.
- `archlex://examples/gcp-data-pipeline`: Reference GCP Pub/Sub & BigQuery data pipeline.

### System Prompts

- `architect_cloud_infrastructure`: Standard prompt instructing LLMs to output valid ArchLex DSL for specified architecture requirements.

---

## 4. Typical LLM Workflow Example

1. **Catalog Query**: The LLM calls `get_cloud_catalog({ provider: "aws" })` to discover available service kinds (e.g. `apigateway`, `lambda`, `dynamodb`, `sns`).
2. **DSL Generation**: The LLM writes valid ArchLex shorthand code:
   ```text
   direction LR
   provider aws

   vpc: production {
     subnet: public {
       apigateway > lambda["Auth Function"]
     }
     subnet: private {
       lambda["Auth Function"] -[writes]-> dynamodb["Users Table"]
     }
   }
   ```
3. **Rendering & Verification**: The LLM invokes `render_diagram({ source })`, receiving the rendered SVG and deep-link URL (`https://playground.archlex.dev/?code=...`) to present to the user.
