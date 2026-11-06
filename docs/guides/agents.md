---

title: Use with AI agents
description: "Add ArchLex to Claude, Cursor, Codex, or any MCP client and ask your agent to diagram AWS, Cloudflare, GCP, or Kubernetes."
lastModified: 2026-10-03T13:00:00-03:00
---

# Use with AI agents

ArchLex gives coding agents a validated cloud diagram language. The agent
writes concise ArchLex source. Humans can still read, diff, and edit it.

The hosted MCP server is free to use, with no API keys or account required. Agents can combine AWS, Cloudflare, GCP and Kubernetes in one diagram, then return the source and a link to keep editing in the free playground.

## 1. Install the skill

```bash
npx skills add baires/archlex
```

## 2. Connect the MCP server

No API key. Remote endpoint: `https://mcp.archlex.dev/mcp`.

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

### Codex

```bash
codex mcp add archlex --url https://mcp.archlex.dev/mcp
```

### VS Code / Copilot

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

Or paste this prompt into your agent:

```text
Set up the ArchLex MCP server in the MCP-capable client or coding-agent environment I am currently using (Claude Code, Cursor, Codex, VS Code/Copilot, or another compatible client).

Use the remote Streamable HTTP endpoint https://mcp.archlex.dev/mcp and name the server archlex. It is free to use and requires no API key, account, or authentication headers.

If this environment does not support MCP, explain that and suggest a compatible client. Otherwise, detect this client's supported setup method and configuration scope. Add or update only the ArchLex entry; preserve all other MCP servers and settings. If you cannot access the configuration, give me the exact client-specific steps instead of claiming it is configured.

Connect to the server and verify that render_diagram, validate_diagram, get_cloud_catalog, and generate_playground_url are available. If a client restart or permission approval is needed, explain what I need to do and verify again afterward.

Once connected, render a small example using render_diagram, show the result if supported, and provide the returned editable playground link. Report any setup or connection errors accurately.
```

## 3. Ask

> Diagram a serverless API on AWS with API Gateway, Lambda, and DynamoDB.

You should get a rendered diagram when the client can show images and the exact
ArchLex source. The playground URL is a short share link when `share_status` is
`created`; otherwise it is a source-encoded editable fallback.

```archlex
direction LR
provider aws

api-gateway -[invokes]-> lambda -[writes]-> dynamodb
```

Try next:

> Diagram a Cloudflare Workers app that reads R2, with DNS selecting the Worker.

> Design a resilient AWS event ingestion system, validate it, and open the
> result in ArchLex Playground.

## What the agent uses

| Tool                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `render_diagram`          | Parse, validate, layout, and render                  |
| `validate_diagram`        | Syntax and semantic checks without layout            |
| `get_cloud_catalog`       | AWS, Cloudflare, GCP, and Kubernetes resource lookup |
| `generate_playground_url` | Deep link to the playground                          |

The skill teaches the DSL, relationship kinds, and how to repair diagnostics.
The MCP server enforces the catalog so agents cannot invent resource names.

Full protocol details: [Remote MCP Server](/guides/mcp-server/).
Language reference: [Language Specification](/specs/language/).
