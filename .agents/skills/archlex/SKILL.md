---
name: archlex
description: Author and render cloud architecture diagrams with the ArchLex DSL. Use when creating AWS, GCP, or Kubernetes architecture diagrams, writing or debugging ArchLex source, rendering diagrams through the ArchLex MCP server (render_diagram, validate_diagram, get_cloud_catalog, generate_playground_url), or producing shareable playground links.
metadata:
  trigger: Cloud architecture diagrams, AWS/GCP/Kubernetes topology, ArchLex DSL, render_diagram MCP tool, diagram generation
  author: ArchLex (https://github.com/baires/archlex)
---

# ArchLex

ArchLex compiles a concise text DSL into accessible, themeable cloud
architecture diagrams (SVG/PNG) with automatic ELK layout and semantic
validation against AWS, GCP, and Kubernetes catalogs.

## Workflow

Always follow this order — guessing service names is the top cause of errors:

1. **Discover** — call `get_cloud_catalog` with the target provider to get
   exact resource kind names (`ecs`, `ebs`, `alb`, ...), containment scopes,
   and relationship kinds.
2. **Author** — write the ArchLex source (quick reference below; full details
   in [references/dsl.md](references/dsl.md)).
3. **Validate** — call `validate_diagram` and iterate until `error_count` is 0.
   When the response contains a `hint` field, apply it — it describes the
   likely fix for parse errors.
4. **Render** — call `render_diagram`. Its response also includes diagnostics,
   so a successful render confirms validity.
5. **Share** — the render response includes `playground_url`, a deep link that
   opens the diagram in the interactive web playground.
   `generate_playground_url` produces the same link without rendering.

## MCP tools

Remote endpoint: `https://mcp.archlex.dev/mcp` (Streamable HTTP transport).

| Tool | Purpose |
| --- | --- |
| `get_cloud_catalog` | Inspect providers, resource kinds, scopes, relationship kinds |
| `validate_diagram` | Fast syntax + semantic validation, no rendering; returns `hint` on parse errors |
| `render_diagram` | Full pipeline: parse, icon hydration, validation, ELK layout, render |
| `generate_playground_url` | Deep link to `playground.archlex.dev` |

`render_diagram` arguments: `source` (required), `theme` (`light`/`dark`),
`direction` (`LR`/`RL`/`TB`/`BT`), `validation` (`strict`/`normal`/`off`),
`format` (`png`/`svg`).

### Handling render output

- Default `format: "png"` returns a base64 PNG image block. Display it inline
  if your client supports images.
- Text-only/CLI clients: pass `format: "svg"`. Rasterization is skipped and the
  SVG is returned as text (also in `structuredContent.svg`). Save it to a
  `.svg` file and view it with your own file tooling.
- Never paste raw SVG or JSON metadata to the user. Show the image (or saved
  file) plus the final source in an `archlex` fenced code block.

## DSL quick reference

```archlex
direction LR
provider aws

vpc: production {
  subnet: public {
    apigateway["API Gateway"] > lambda["Auth Service"]
  }
  subnet: private {
    lambda["Auth Service"] -[writes]->|SQL| dynamodb["Users Table"]
  }
}
```

- **Directives** (top of file): `provider aws|gcp|k8s`, `direction LR|RL|TB|BT`,
  `validation normal|strict|off`, `theme light|dark`.
- **Resources**: `rds` (implicit), `primary: rds` (named instance),
  `primary: rds["Primary DB"]` (display label), `aws.rds` (provider-qualified).
- **Edges**: `a > b` shorthand, `a -> b`, `a <- b`, `a <-> b`, `a -- b`,
  `a -.-> b` (dotted). Chains: `a > b > c`.
- **Scopes**: `account`, `region`, `vpc`, `subnet` (cloud);
  `cluster`, `namespace` (Kubernetes).

## Critical rules

1. **Relationship kinds are single lowercase words.** `-[writes]->` is valid;
   `-[serves static]->` is a parse error. Free-form display text goes in pipes:
   `api -[writes]->|PostgreSQL over TLS| database`.
2. **Identifiers** start with a letter or `_` and contain only letters, digits,
   `_`, `-`. No slashes or spaces — use a quoted display label instead.
3. **Use named instances** (`api: ecs`, `worker: ecs`) when a diagram needs
   more than one instance of a kind.
4. **Known kinds** (custom kinds render but may emit info diagnostics):
   - Connectivity: `connects`, `routes`, `proxies`
   - Data: `reads`, `writes`, `caches`, `encrypts`, `decrypts`
   - Events: `publishes`, `subscribes`, `invokes`, `triggers`, `schedules`
   - Operations: `monitors`, `logs`, `traces`, `alerts`
   - Processing: `processes`, `transforms`, `analyzes`, `transcodes`, `packages`
   - Delivery: `orchestrates`, `builds`, `deploys`
   - Governance: `assumes-role`, `protects`, `governs`, `catalogs`
   - Lifecycle: `replicates`, `migrates`, `discovers`

## References

- [references/dsl.md](references/dsl.md) — full DSL reference: identity,
  labels, containment, arrows, comments, recovery behavior
- [references/providers.md](references/providers.md) — AWS/GCP/Kubernetes
  scopes, validation modes, and notable semantic rules
- [references/examples.md](references/examples.md) — complete diagrams for
  AWS, GCP, and Kubernetes to use as starting points
