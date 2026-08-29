---
title: Layout and Rendering Specification
description: "How ArchLex lays out and renders diagrams, from ELK compound graph mapping and geometry caching to icon resolution and deterministic accessible SVG."
---

# Layout and Rendering Specification

## ELK mapping

`@archlex/layout-elk` maps scopes to compound ELK nodes, resources to measured
children, and relationships to edges with explicit ports. It supports `LR`,
`RL`, `TB`, and `BT` directions with layered layout and orthogonal routing.

Cloud scopes and Kubernetes scopes use the same compound-graph path. Provider
semantics decide containment before layout begins.

## Geometry and caching

Each drawable element receives finite coordinates and non-negative dimensions.
Children remain inside parent content bounds, and sibling resource rectangles do
not overlap.

Layout fingerprints include stable IDs, hierarchy, measured sizes, ports,
edges, direction, spacing, and engine version. They exclude icon artwork,
diagnostic text, theme colors, focus, hover, and selection. An icon hydration
render can reuse the base geometry.

## Icon resolution

Providers supply bundled sanitized artwork for common resources. `prepare()`
collects requests for missing artwork. Browser and Node icon loaders fetch from
pinned AWS, Google Cloud, and Kubernetes definitions, sanitize the response, and
return an `IconRegistry`.

`renderPrepared()` resolves icons in this order:

1. A sanitized icon from the supplied registry
2. Bundled provider artwork already attached to the graph
3. A generic sanitized fallback

The renderer does not fetch network resources. It deduplicates icon symbols by
key and content hash, namespaces internal fragment IDs, and references symbols
with fragment-only `<use>` elements.

## Deterministic SVG

`@archlex/renderer-svg` returns a complete SVG string with a namespace, view
box, title, description, definitions, scopes, edges, nodes, labels, icons, and
diagnostic markers. It sorts elements by stable ID and formats numbers
consistently.

Resource cards use provider artwork, a readable label, and shared neutral
surfaces. Scope tint, stroke, and labels distinguish account, region, VPC,
subnet, cluster, and namespace boundaries. Edges stay behind nodes and preserve
direction, dash style, machine-readable kind, and display label.

## Themes and diagnostics

Built-in light and dark themes control surfaces, text, edges, focus, warnings,
and errors. Validated custom theme data can replace those tokens.

Invalid nodes use an error border. Warnings use a distinct marker and stroke
pattern. Invalid edges preserve their route. Color does not carry diagnostic
meaning alone.

## Accessibility

The root SVG contains a title and description. Nodes, scopes, and interactive
edges receive accessible names and keyboard focus. Navigation follows stable
graph order. Decorative provider paths stay hidden from accessibility APIs.

When a display label differs from the provider service name, the accessible
name includes both values.

## Safety

Renderer output and sanitized icons reject scripts, `foreignObject`, event
attributes, external URLs, data URLs, CSS imports, active animation, and unsafe
namespaces. Provider artwork may retain inert fragment-local gradients, masks,
and filters after sanitization.

`mountSvg` accepts only ArchLex-generated SVG. Applications should not pass raw
HTML or unsanitized external SVG through that helper.
