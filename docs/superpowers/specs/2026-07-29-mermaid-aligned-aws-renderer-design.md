# Mermaid-Aligned AWS Renderer Design

**Date:** 2026-07-29  
**Status:** Approved for implementation planning  
**Target packages:** `@archlex/aws`, `@archlex/renderer-svg`, playground

## Objective

Replace ArchLex's heavy glass-card rendering with a restrained, Mermaid-aligned visual system and replace recreated AWS glyphs with official AWS Architecture Icons for every currently supported AWS service.

The result must make topology and containment visually dominant. Official AWS artwork supplies provider identity; the renderer supplies quiet structure. The SVG output remains deterministic, self-contained, accessible, and safe to export.

## Scope

This pass covers the currently supported AWS services: Amazon RDS, Amazon RDS Proxy, and Amazon Elastic Container Service (ECS). It also introduces a reusable importer so later catalog additions can use the same asset workflow.

It does not bundle the complete AWS Architecture Icons package, fetch icons at render time, add new cloud services, or change the ArchLex language.

## Asset Architecture

Official SVG files are vendored in a clearly identified source directory under `packages/aws`. These source files are the only artwork inputs for supported AWS services.

A reusable importer:

- accepts an explicit service-to-file mapping;
- validates that each input is an SVG with a usable `viewBox`;
- removes scripts, event attributes, external references, imports, active animation, and unsupported elements;
- removes non-rendering metadata when it is unnecessary while preserving official paths, geometry, and colors;
- normalizes output deterministically;
- computes stable per-icon and manifest checksums; and
- generates the inline fragments consumed by the runtime catalog.

Generated fragments are checked into or produced by the package's established build workflow, as determined during implementation planning. Rendering never performs a network request. Missing, invalid, or unmapped assets fail the importer with a message containing the service key and source file.

The runtime icon keys remain stable so existing parsed diagrams do not require migration. RDS, RDS Proxy, and ECS resolve to official sanitized fragments rather than simplified recreated glyphs.

## Rendering System

### Resource nodes

Resource nodes use compact Mermaid-like cards instead of glassmorphism:

- neutral theme surface;
- one-pixel border;
- modest corner radius;
- restrained or absent shadow;
- official icon rendered at approximately 44–48 pixels without recoloring or a synthetic badge; and
- centered service label below the icon.

Default width is approximately 112–128 pixels. Height provides explicit icon and label regions so they cannot overlap. Labels use deterministic measurement and wrapping. A label may occupy at most two lines; overflow uses a deterministic truncation strategy with an accessible full name retained in the node's ARIA label.

Nodes without icons use the same card geometry and a centered text treatment. Diagnostic nodes keep the base geometry rather than growing or glowing.

### Scope containers

Account, region, VPC, and subnet containers share one restrained system. Nesting, spacing, subtle neutral tint, and stroke pattern express hierarchy. Scope headers are plain inline labels near the top-left boundary, not floating pills.

Scope types may vary stroke weight, dash pattern, and surface tint, but do not receive independent saturated accent colors. Child content begins below the label region. Existing containment guarantees remain unchanged.

### Edges and markers

Edges render behind nodes and scope content. ELK remains responsible for orthogonal routing. The SVG renderer may round orthogonal corners with small quadratic curves while preserving all route points and semantic direction.

Edges use thin neutral strokes and compact Mermaid-like markers. Marker geometry and endpoint offsets prevent arrowheads from covering node borders or floating in scope headers. Dotted and bidirectional relationship semantics remain visually distinct. Hover effects, if retained, change stroke emphasis without animation or glow.

### Themes and diagnostics

Light and dark themes expose equivalent hierarchy. Dark mode uses neutral slate surfaces and readable contrast rather than cyan outlines, glass gradients, sheen, or neon glow.

Error and warning states combine color with a non-color indicator such as stroke pattern and a compact status marker. Focus styling remains visible for keyboard users. Decorative icon content is hidden from accessibility APIs, while each resource exposes its complete label.

### SVG guarantees

Output remains:

- complete and standalone;
- deterministic for identical graph, diagnostics, and theme inputs;
- free of scripts, event handlers, external URLs, imports, foreign objects, and active animation;
- compatible with exported SVG and PNG workflows; and
- annotated with stable ArchLex IDs and accessible names.

## Playground Integration

The playground retains its editor/preview layout and existing controls. Its preview should present the SVG at a useful fitted scale with enough neutral canvas space to judge topology. The renderer, rather than playground-only CSS, owns all diagram styling required for exported fidelity.

The two supplied scenarios are the visual acceptance cases:

1. an unscoped left-to-right RDS Proxy → RDS → ECS chain; and
2. an account/region/VPC/subnet hierarchy containing RDS Proxy → RDS.

Both must remain legible in light and dark themes and at desktop and narrow preview widths.

## Error Handling

- An importer input that is missing, malformed, unsafe after sanitization, or lacks required geometry fails before manifest generation.
- A supported catalog entry without a mapped official icon fails tests and the build-time validation step.
- Runtime unknown services continue to use the generic fallback glyph and emit the existing semantic behavior; they never trigger asset fetching.
- Invalid graph geometry follows the existing renderer diagnostics path and must not produce malformed SVG.

## Testing and Acceptance

### Importer and catalog

- Prove unsafe elements and attributes are rejected or removed according to the sanitizer contract.
- Prove official colors, paths, and `viewBox` geometry survive normalization.
- Prove repeated imports are byte-identical and checksums are stable.
- Prove unsupported or incorrectly mapped files fail with actionable errors.
- Prove RDS, RDS Proxy, and ECS resolve to the generated official fragments.

### Renderer

- Prove icon and label regions do not overlap for short and two-line labels.
- Prove compact card, scope label, marker, theme, focus, and diagnostic output.
- Prove glass gradients, sheen lines, neon glows, colored icon badges, and scope header pills are absent.
- Prove relationships preserve arrow and dash semantics.
- Prove repeated serialization is byte-identical and exported SVG passes existing safety checks.

### Layout and browser verification

- Keep containment, direction, cycle, disconnected graph, and dense fan-in/out tests green.
- Add browser coverage for both acceptance scenarios in light and dark themes.
- Assert resource rectangles and text do not overlap, children remain within scope content bounds, and edge endpoints meet node boundaries.
- Capture and inspect desktop and narrow-width screenshots for final visual QA.

## Rollout and Change Boundaries

The implementation replaces the current uncommitted glassmorphism renderer direction. It must preserve unrelated user changes and should reuse valid work such as safe rounded orthogonal routing where that work fits this design.

No compatibility migration is required: diagram syntax, public service keys, and runtime renderer entry points remain stable. Any theme token changes should be internal unless an existing exported type requires a deprecation-compatible transition.

AWS states that its Architecture Icons are AWS-approved assets intended for customers and partners to create architecture diagrams. Vendored files must retain their original artwork and any repository attribution or licensing notice required by the downloaded package.
