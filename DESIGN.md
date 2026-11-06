---
version: alpha
colors:
  ground: '#f8f8f4'
  ink: '#171814'
  muted: '#606359'
  line: '#dedfd8'
  accent: '#356d12'
  warning: '#885006'
typography:
  display:
    fontFamily: 'Bricolage Grotesque Variable, Instrument Sans Variable, sans-serif'
  body:
    fontFamily: 'Instrument Sans Variable, sans-serif'
  code:
    fontFamily: 'Commit Mono, monospace'
rounded:
  control: 999px
  panel: 12px
  code: 10px
omitted:
  - section: spacing
    reason: 'Canonical scale is maintained in packages/design/tokens.css.'
  - section: components
    reason: 'The shared package owns tokens; each application owns its components.'
---

# ArchLex design direction

## Overview

Agent-first multicloud architecture. The landing leads with LLM/MCP readiness, a genuinely mixed-provider diagram and the free hosted MCP with no API keys or account. The central flow is ask an agent → MCP checks and renders → a human continues in the playground. The architecture review bench provides supporting proof rather than making AWS the product identity. English product copy; no invented customers or metrics.

Three territories considered (originality / fit / feasibility / portability, 1–5; lower portability is better): architecture review bench 4/5/5/1; cloud atlas 4/4/4/3; annotated language specification 3/4/5/3. The review bench wins because typed relationship validation is a specific, demonstrable ArchLex capability.

Concept card:
- Idea: LLM-ready multicloud diagrams, with a free MCP server and a human editing workspace.
- Metaphor: an architecture review bench, with a drawing and its source open together.
- Signature: change Lambda → DynamoDB from writes to invokes, reveal the real provider diagnostic, then correct it.
- Emotion: immediate clarity and the confidence of a precise tool.
- Motion verb: trace and settle. Selection follows the connection; small controls settle into place.
- Screenshot: a real source diagram joining Cloudflare, AWS, GCP and Kubernetes, beside a clear agent/MCP promise. The secondary review bench demonstrates an actual AWS warning.

## Colors

Runtime ownership is Model B: packages/design is canonical. This document mirrors its accepted light palette, rather than generating another set. Landing and playground import the same package. Themes preserve the existing system/light/dark preference. Green carries checked/selected states; amber carries semantic warnings, accompanied by text. A warning means a declared diagram rule needs review, not that a deployed system has been audited.

## Typography

Bricolage Grotesque Variable is the display voice, Instrument Sans Variable is UI and reading text, Commit Mono is code only. All are local font packages. Display uses tight tracking and roughly 1.0 leading; body uses 16–18px and 1.5 leading. Small UI text is at least 12px with AA contrast. Do not use monospace, uppercase labels, or numbers as decoration.

## Layout

Hybrid identity: expressive marketing in apps/landing; dense task-oriented workbench in apps/playground. Keep the playground workflow intact. Landing has a 1280px outer measure and 12-column desktop logic: a left-aligned agent-first statement, an adjacent free-MCP promise, then a full-width mixed-provider drawing. Mobile is composed as a single column with a top-to-bottom diagram, never a miniature split screen.

Section plan:

    Hero        agent statement (7 cols) | promise and actions (5 cols)
                full-width multicloud source drawing and three-step workflow
    Start       MCP first, then skill / playground / SDK, compact underline tabs
    Review      semantic proof (5 cols) | AWS connection inspector (7 cols)
    Meaning     large statement    | three concise semantic facts
    Changes     source diff (7)    | explanation (5)
    Coverage    four provider rows + real source links
    FAQ         short questions in a reading column
    Footer      final invitation + quiet resource navigation

No sticky theatrical sequence, artificial loader, scroll hijack, or repeated equal feature cards. Section spacing varies with the content. Avoid decorative gradients, grain, fake terminal titlebars, and obscured code/image comparisons. Genericness test: the broad SaaS hero was replaced by a provider-validated relationship review, which depends on ArchLex's actual compiler.

## Elevation & Depth

The review drawing is the main framed object. Other sections use space and alignment rather than nested panels and repeated shadows. Surfaces derive from shared semantic tokens. The page remains complete without JavaScript; example controls progressively enhance precompiled output.

## Shapes

Use shared control, panel, and code radii. Do not locally redefine the package's structural tokens. Diagram nodes keep their renderer-owned geometry.

## Components

Token mapping: themes.css → semantic CSS variables → landing global.css and playground styles.css. fonts.css → font roles → headings/body/code in both applications. tokens.css → spacing/radius/focus/motion/scrollbar baseline → both apps. Warning colors are status-warning and status-warning-surface. No app copies raw palette values.

The landing ReviewBench owns a bounded two-state example. Both states, diagnostics and desktop/mobile SVGs are generated by @archlex/core at build time; the core and ELK never enter the client bundle. A single client state updates drawing, source, selected endpoints, diagnostic and playground URL together. No arbitrary editor pretends to compile. No external service is needed to try the example.

Use 44px primary hit areas, real buttons and links, visible focus, readable overflow with keyboard access, and status messages. Native theme select is intentionally browser-owned. Setup tabs are compact underline tabs, never stretched pill buttons; MCP is the default. Copy controls sit inside their command panels and share one clipboard handler with the hero prompt. Tabs use arrow/Home/End navigation and stable geometry; clipboard failures leave a selectable command and clear feedback. The default diagram and source remain readable with JavaScript disabled.

The review bench is deliberately still at rest: moving connections can suggest traffic measurement that ArchLex does not perform. Motion responds to inspection and corrections. GSAP owns authored JS motion; reduced motion skips it, leaves every element visible, and disables smooth scrolling. Native page navigation can use progressive CSS view transitions; reduced motion opts out.

## Do's and Don'ts

- Show actual SVG output, actual source, and actual diagnostic codes.
- Use checked examples as entry points into the existing playground code query parameter.
- Keep provider counts in data rather than repeating claims through the page.
- Never promise zero hallucinations or certify deployment correctness.
- Preserve the canonical owl artwork and the current public URLs.
- Inspect home, AWS page and 404 in both themes and narrow widths whenever shared styles change.
