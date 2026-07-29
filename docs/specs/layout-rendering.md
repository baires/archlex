# Layout and Rendering Specification

## ELK mapping

`@cloudmer/layout-elk` maps groups to nested ELK compound nodes, resources to measured children, and relationships to edges with explicit ports. ELK layered layout and orthogonal routing are defaults. `LR`, `RL`, `TB`, and `BT` map directly to layout direction. Port choice never reverses a relationship or changes its kind.

## Worker protocol and caching

Browser messages contain protocol version, request ID, graph, and options. Responses echo the ID with graph, diagnostics, and metadata. Cancellation names the request ID; late output is ignored. Protocol mismatch is an internal error. The inline adapter shares mapping/normalization code and must match worker results after timing metadata is removed.

Fingerprints include stable IDs, hierarchy, measured sizes, ports, edges, direction, spacing, and engine version. They exclude diagnostic prose, theme colors, focus, hover, and selection.

## Geometry invariants

Every drawable element has finite coordinates and non-negative size. Edges contain finite points and reference existing nodes. Children remain within parent content bounds and sibling resource rectangles do not overlap. Invalid/unknown semantic elements obey identical geometry rules.

## Deterministic SVG

The DOM-free renderer returns complete SVG with namespace, view box, accessible title/description, definitions, groups, edges, nodes, labels, icons, and diagnostics. Items sort by stable ID. Numbers use fixed precision and omit negative zero.

Public attributes are `data-cloudmer-id`, `data-cloudmer-kind`, `data-cloudmer-validity`, and `data-cloudmer-diagnostics`. Arrowheads reflect semantic direction; dotted relationships use dash styling; labels do not alter semantics.

## AWS icon workflow

The supported AWS icon subset is deliberately limited to Amazon RDS (`aws.rds`), Amazon RDS Proxy (`aws.rds-proxy`), and Amazon Elastic Container Service (`aws.ecs`). Their official Architecture Icon source SVGs are vendored under `packages/aws/assets/official/`; the renderer consumes only the generated, inline sanitized fragments. It never fetches artwork at render time. Unknown services retain the generic fallback glyph.

Run `pnpm --filter @cloudmer/aws icons:check` to confirm that the checked-in generated fragments still match the official source files. Run `pnpm --filter @cloudmer/aws icons:generate` only when intentionally regenerating them. The importer validates view-box geometry, produces deterministic normalized fragments and checksums, and rejects unsafe or external content before it can enter the runtime catalog.

## Mermaid-aligned visual system

This specification supersedes the prior glassmorphism rendering direction. Resources use compact neutral cards with a one-pixel border, modest corner radius, official 48px artwork without recoloring or synthetic badges, and centered labels. Label layout is deterministic: labels occupy at most two lines, overflow is truncated consistently, and the complete label remains in the node's accessible name.

Account, region, VPC, and subnet scopes use one neutral containment system. Subtle tint, stroke weight, and dash pattern communicate scope type; plain inline labels near the top-left boundary identify each scope. Scope headers are not floating pills, and the content region begins below the label.

Edges are thin neutral orthogonal routes behind node and scope content. Compact markers preserve arrow and dash semantics without covering node borders. The serializer may round orthogonal corners while preserving ELK route points.

## Themes, diagnostics, and accessibility

Sanitized provider icons are inline fragments; external URLs are forbidden. Unknown resources use a generic glyph. AWS artwork is not recolored. Built-in light/dark themes and validated custom themes control surfaces, text, edges, focus, warnings, and errors.

Light and dark themes retain the same hierarchy with neutral surfaces and readable contrast, rather than gradients, sheen, cyan outlines, glow, or animation. Invalid edges are red/dashed with a marker; invalid nodes have an error border; warnings use amber with a distinct dash pattern; unknown semantics use a restrained information marker. Color is never the sole indicator: diagnostics include a compact status marker and/or stroke pattern.

Root SVG has title/description. Nodes, groups, and interactive edges have accessible names, keyboard focus, and visible focus. Navigation follows stable graph order rather than incidental coordinates. Decorative icon paths are hidden from accessibility APIs.

SVG prohibits `script`, `foreignObject`, event attributes, external URLs (including HTTP(S), protocol-relative, relative, root-relative, and data references), imports, CSS animation declarations, and active animation elements. It contains no gradients or filters. `mountSvg` applies only to CloudMer-generated output.

## Verification

Test containment, ports, all directions, cycles, disconnected elements, invalid elements, and dense fan-in/out. Verify worker/inline parity, byte-identical repeated output, theme/diagnostic snapshots, SVG safety (including radial gradients, CSS animation names, and non-fragment external references), axe-core, and keyboard behavior. Browser acceptance covers the unscoped RDS Proxy → RDS → ECS chain and the nested account/region/VPC/subnet RDS Proxy → RDS scenario in both themes and at desktop and narrow widths.
