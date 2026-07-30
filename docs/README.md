# CloudMer Documentation

CloudMer is a browser-first TypeScript library that turns a concise, provider-aware language into accessible cloud architecture diagrams. AWS and GCP are the supported providers; semantic validation is the main product capability.

## Reading order

1. [Foundation design](superpowers/specs/2026-07-27-cloudmer-foundation-design.md) — approved product intent and MVP boundaries.
2. [System architecture](architecture/system-architecture.md) — package boundaries, pipeline, runtimes, and failures.
3. [Technology stack](architecture/technology-stack.md) — locked tools and compatibility policy.
4. [Contribution guide](architecture/contribution-guide.md) — package layout, rules, catalog, and extension workflows.
5. [Language specification](specs/language.md) and [public API](specs/public-api.md).
6. [AWS semantics](specs/aws-semantics.md), [GCP semantics](specs/gcp-semantics.md), [layout/rendering](specs/layout-rendering.md), and [playground](specs/playground.md).
7. [MVP roadmap](ROADMAP.md) and executable [TODO checklist](TODO.md).

## Authority and change policy

- The foundation design owns product intent, scope, and acceptance criteria.
- `docs/specs/` owns observable behavior and public contracts.
- `docs/architecture/` owns implementation boundaries and stack decisions.
- `ROADMAP.md` owns phase order and exit gates; `TODO.md` tracks execution only.
- If documents conflict, fix the lower-authority document. A product change updates the foundation design first.
- Public API, grammar, diagnostic-code, or package-boundary changes require the corresponding spec update.

## Status

Architecture is approved. No production packages exist yet. The npm scope `@cloudmer/*` is provisional and packages remain private until the release phase.
