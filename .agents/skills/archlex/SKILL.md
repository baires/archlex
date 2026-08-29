---
name: archlex
description: Use when creating AWS, GCP, or Kubernetes architecture diagrams; when a user asks to diagram cloud infrastructure, draw a system architecture or topology, or produce a shareable architecture diagram; or when writing or debugging ArchLex DSL source.
metadata:
  trigger: Cloud architecture diagrams, AWS GCP Kubernetes topology, system architecture, draw infrastructure, ArchLex DSL, diagram generation
  author: ArchLex (https://github.com/baires/archlex)
---

# ArchLex

ArchLex compiles a concise text DSL into accessible, themeable cloud
architecture diagrams (SVG/PNG) with automatic ELK layout and semantic
validation against AWS, GCP, and Kubernetes catalogs.

## Workflow

For a normal diagram request:

1. **Author** — write the ArchLex source (quick reference below; full details
   in [references/dsl.md](references/dsl.md)). Use familiar catalog identifiers
   directly instead of making exploratory calls for common services.
2. **Render** — call `render_diagram` directly. It performs syntax and semantic
   validation internally, so a successful render confirms validity.
3. **Repair once if needed** — apply the returned diagnostics and retry. When a
   parse error includes `hint`, use it as the likely correction.
4. **Present** — display the returned image inline, followed by the exact final
   source in an `archlex` fence and the returned `playground_url`.

Use the supporting tools only when their condition applies:

- If a resource identifier, containment rule, or relationship kind is unknown,
  call `get_cloud_catalog` once with a focused provider/query, then render.
- For validation-only requests, call `validate_diagram` and report its result
  without rendering. After a failed render, it may also help isolate errors;
  iterate until `error_count` is 0 before retrying the render.
- For link-only requests, call `generate_playground_url`. Never call it after
  `render_diagram`, because rendering already returns the same deep link.

## MCP tools

Modern endpoint: `POST https://mcp.archlex.dev/mcp` using Streamable HTTP and
protocol version `2026-07-28`. The `/sse` and `/messages` routes are deprecated
compatibility endpoints; do not use them for new integrations.

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
- A successful modern response has `resultType: "complete"`; read the image
  from `content` and the exact source, diagnostics, counts, and
  `playground_url` from `structuredContent`.
- Clients may include `_meta.progressToken` to receive request-scoped SSE
  progress for parsing, validation, icon hydration, layout, and rendering.

## DSL quick reference

```archlex
direction LR
provider aws

vpc production {
  subnet public {
    api-gateway["API Gateway"] > lambda["Auth Service"]
  }
  subnet private {
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
<!-- BEGIN GENERATED RELATIONSHIP KINDS -->
   - Connectivity: `connects`, `routes`, `proxies`, `exposes`
   - Dependency: `depends-on`, `attaches`
   - Data: `reads`, `writes`, `caches`, `encrypts`, `decrypts`, `streams`, `stores`, `backs-up`, `restores`, `archives`
   - Events: `publishes`, `subscribes`, `invokes`, `triggers`, `schedules`, `notifies`
   - Operations: `monitors`, `logs`, `traces`, `alerts`
   - Processing: `processes`, `transforms`, `analyzes`, `transcodes`, `packages`
   - Delivery: `orchestrates`, `builds`, `deploys`, `provisions`
   - Governance: `assumes-role`, `protects`, `governs`, `catalogs`, `authenticates`, `authorizes`, `audits`, `scans`, `trusts`
   - Reliability: `fails-over-to`
   - Lifecycle: `replicates`, `migrates`, `discovers`
<!-- END GENERATED RELATIONSHIP KINDS -->
5. **Providers validate typed edges.** AWS, GCP, and Kubernetes declare
   allowed sources/targets per kind; violating pairs warn
   (`*-RELATIONSHIP-INVALID-ENDPOINT-001`). Check `get_cloud_catalog` for the
   current declarations before wiring unfamiliar services.

## References

- [references/dsl.md](references/dsl.md) — full DSL reference: identity,
  labels, containment, arrows, comments, recovery behavior
- [references/providers.md](references/providers.md) — AWS/GCP/Kubernetes
  scopes, validation modes, and notable semantic rules
- [references/examples.md](references/examples.md) — complete diagrams for
  AWS, GCP, and Kubernetes to use as starting points
