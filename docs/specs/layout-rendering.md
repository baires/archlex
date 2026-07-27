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

## Icons, themes, diagnostics, and accessibility

Sanitized provider icons are inline fragments; external URLs are forbidden. Unknown resources use a generic glyph. AWS artwork is not recolored. Built-in light/dark themes and validated custom themes control surfaces, text, edges, focus, warnings, and errors.

Invalid edges are red/dashed with a marker; invalid nodes have an error border; warnings use amber; unknown semantics use a restrained information marker. Color is never the sole indicator.

Root SVG has title/description. Nodes, groups, and interactive edges have accessible names, keyboard focus, and visible focus. Navigation follows stable graph order rather than incidental coordinates. Decorative icon paths are hidden from accessibility APIs.

SVG prohibits `script`, `foreignObject`, event attributes, external URLs, imports, and active animation. `mountSvg` applies only to CloudMer-generated output.

## Verification

Test containment, ports, all directions, cycles, disconnected elements, invalid elements, and dense fan-in/out. Verify worker/inline parity, byte-identical repeated output, theme/diagnostic snapshots, SVG safety, axe-core, and keyboard behavior.
