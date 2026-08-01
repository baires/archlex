# Layout and Rendering Specification

## ELK mapping

`@archlex/layout-elk` maps groups to nested ELK compound nodes, resources to measured children, and relationships to edges with explicit ports. ELK layered layout and orthogonal routing are defaults. `LR`, `RL`, `TB`, and `BT` map directly to layout direction. Port choice never reverses a relationship or changes its kind.

## Worker protocol and caching

Browser messages contain protocol version, request ID, graph, and options. Responses echo the ID with graph, diagnostics, and metadata. Cancellation names the request ID; late output is ignored. Protocol mismatch is an internal error. The inline adapter shares mapping/normalization code and must match worker results after timing metadata is removed.

Fingerprints include stable IDs, hierarchy, measured sizes, ports, edges, direction, spacing, and engine version. They exclude diagnostic prose, theme colors, focus, hover, and selection.

## Geometry invariants

Every drawable element has finite coordinates and non-negative size. Edges contain finite points and reference existing nodes. Children remain within parent content bounds and sibling resource rectangles do not overlap. Invalid/unknown semantic elements obey identical geometry rules.

## Deterministic SVG

The DOM-free renderer returns complete SVG with namespace, view box, accessible title/description, definitions, groups, edges, nodes, labels, icons, and diagnostics. Items sort by stable ID. Numbers use fixed precision and omit negative zero.

Icon artwork is deduplicated: each unique icon (by icon key and content hash) is emitted once as a `<symbol>` in `<defs>` with its internal identifiers namespaced per symbol, and each node references it through a fragment-only `<use>`. Icons without a view box or in non-SVG fragment form keep the per-node inline fallback.

Public attributes are `data-archlex-id`, `data-archlex-kind`, `data-archlex-validity`, and `data-archlex-diagnostics`. Arrowheads reflect semantic direction; dotted relationships use dash styling; labels do not alter semantics.

## AWS icon workflow

The supported AWS icon subset is deliberately limited to Amazon RDS (`aws.rds`), Amazon RDS Proxy (`aws.rds-proxy`), and Amazon Elastic Container Service (`aws.ecs`). Their official Architecture Icon source SVGs are vendored under `packages/aws/assets/official/`; the renderer consumes only the generated, inline sanitized fragments. It never fetches artwork at render time. Unknown services retain the generic fallback glyph.

Run `pnpm --filter @archlex/aws icons:check` to confirm that the checked-in generated fragments still match the official source files. Run `pnpm --filter @archlex/aws icons:generate` only when intentionally regenerating them. The importer validates view-box geometry, produces deterministic normalized fragments and checksums, rejects unsafe or external content, and preserves inert provider-artwork gradients and filters that use fragment-local references.

## Mermaid-aligned visual system

This specification supersedes the prior glassmorphism rendering direction. Resources use compact neutral cards with a one-pixel border, modest corner radius, official 48px artwork without recoloring or synthetic badges, and centered labels. Card width is label-aware: the layout adapter picks the smallest of 128, 160, or 192 px that wraps the label in at most two lines without truncation, and wrapping derives deterministically from the chosen width (`floor((width - 16) / 7)` characters per line). Overflow beyond the widest tier is truncated consistently, and the complete label remains in the node's accessible name. A node's visible label is its display label when authored, otherwise its instance name, otherwise the service display name; when the visible label differs from the service display name, the accessible name combines both (`"<label> (<Service Display Name>)"`).

Account, region, VPC, and subnet scopes use one neutral containment system. Subtle tint, stroke weight, and dash pattern communicate scope type; plain inline labels near the top-left boundary identify each scope. Scope headers are not floating pills, and the content region begins below the label.

Edges are thin neutral orthogonal routes behind node and scope content. Compact markers preserve arrow and dash semantics without covering node borders. The serializer may round orthogonal corners while preserving ELK route points.

## Themes, diagnostics, and accessibility

Sanitized provider icons are inline fragments; external URLs are forbidden. Unknown resources use a generic glyph. AWS artwork is not recolored. Built-in light/dark themes and validated custom themes control surfaces, text, edges, focus, warnings, and errors.

Light and dark themes retain the same hierarchy with neutral surfaces and readable contrast, rather than ArchLex-owned glass gradients, sheen, cyan outlines, glow filters, or animation. Inert gradients and filters inside sanitized official provider artwork are preserved for artwork fidelity. Invalid edges are red/dashed with a marker; invalid nodes have an error border; warnings use amber with a distinct dash pattern; unknown semantics use a restrained information marker. Color is never the sole indicator: diagnostics include a compact status marker and/or stroke pattern.

Root SVG has title/description. Nodes, groups, and interactive edges have accessible names, keyboard focus, and visible focus. Navigation follows stable graph order rather than incidental coordinates. Decorative icon paths are hidden from accessibility APIs.

SVG prohibits `script`, `foreignObject`, event attributes, external URLs (including HTTP(S), protocol-relative, relative, root-relative, and data references), imports, CSS animation declarations, and active animation elements. ArchLex's own renderer chrome and definitions add no glass gradients or glow filters; sanitized provider artwork may retain inert, fragment-local gradients and filters. `mountSvg` applies only to ArchLex-generated output.

## Verification

Test containment, ports, all directions, cycles, disconnected elements, invalid elements, and dense fan-in/out. Verify worker/inline parity, byte-identical repeated output, theme/diagnostic snapshots, SVG safety (including CSS animation names and non-fragment external references), preservation of inert provider gradients and filters, axe-core, and keyboard behavior. Browser acceptance covers the unscoped RDS Proxy → RDS → ECS chain and the nested account/region/VPC/subnet RDS Proxy → RDS scenario in both themes and at desktop and narrow widths.
