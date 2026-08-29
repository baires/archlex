---
title: Use with AI agents
description: "Add ArchLex to Claude, Cursor, Codex, or any MCP client and ask your agent to diagram AWS, GCP, or Kubernetes."
lastModified: 2026-08-28T12:00:00-03:00
---

# Use with AI agents

ArchLex gives coding agents a validated cloud diagram language. The agent
writes concise ArchLex source. Humans can still read, diff, and edit it.

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
Set up the ArchLex MCP server for this project using the official remote
Streamable HTTP endpoint at https://mcp.archlex.dev/mcp. Verify the
connection, list the available ArchLex tools, and tell me when it is ready.
Do not change unrelated MCP servers.
```

## 3. Ask

> Diagram a serverless API on AWS with API Gateway, Lambda, and DynamoDB.

You should get a rendered diagram, the exact ArchLex source, and a
[playground](https://playground.archlex.dev) link.

```archlex
direction LR
provider aws

api-gateway -[invokes]-> lambda -[writes]-> dynamodb
```

Try next:

> Design a resilient AWS event ingestion system, validate it, and open the
> result in ArchLex Playground.

## What the agent uses

| Tool | Purpose |
| --- | --- |
| `render_diagram` | Parse, validate, layout, and render |
| `validate_diagram` | Syntax and semantic checks without layout |
| `get_cloud_catalog` | AWS, GCP, and Kubernetes resource lookup |
| `generate_playground_url` | Deep link to the playground |

The skill teaches the DSL, relationship kinds, and how to repair diagnostics.
The MCP server enforces the catalog so agents cannot invent resource names.

Full protocol details: [Remote MCP Server](/guides/mcp-server).
Language reference: [Language Specification](/specs/language).
