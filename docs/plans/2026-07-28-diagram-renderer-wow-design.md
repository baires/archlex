# Diagram Rendering Engine "WOW" Visual Design

**Date**: 2026-07-28  
**Status**: Approved  
**Target Package**: `@cloudmer/renderer-svg`

---

## 1. Executive Summary

The purpose of this design is to upgrade `@cloudmer/renderer-svg` from a plain vector generator to a state-of-the-art diagram rendering engine capable of creating visual "WOW" moments. The updated engine introduces self-contained SVG definitions (filters, drop shadows, linear/radial gradients), multi-layered glassmorphism node cards, pill-badged scope containers, smooth rounded orthogonal edge routing, gradient arrow markers, and interactive hover state animations.

---

## 2. Visual Architecture & SVG Definitions (`<defs>`)

All visual effects are embedded directly into the generated SVG's `<defs>` tag, ensuring perfect visual fidelity both inside browser DOM wrappers and when exported/downloaded as standalone SVG or PNG files.

### 2.1 SVG Filters & Ambient Shadows
- `cloudmer-node-shadow`: Dual-pass gaussian blur drop shadow (`feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.35"`).
- `cloudmer-scope-shadow`: Soft ambient outer shadow (`feDropShadow dx="0" dy="2" stdDeviation="8" flood-opacity="0.15"`).
- `cloudmer-glow-error`: Outer neon glow filter (`flood-color="#ef4444" stdDeviation="4"`).
- `cloudmer-glow-warning`: Outer neon glow filter (`flood-color="#f59e0b" stdDeviation="4"`).

### 2.2 Theme Tokens & Gradients
Expanded token system in `packages/renderer-svg/src/theme/index.ts`:
- **Dark Theme**: Rich slate background (`#090d16`), glass card surface gradient (`#1e293b` to `#0f172a`), neon blue border (`#38bdf8`), scope fill tints.
- **Light Theme**: Clean crisp background (`#f8fafc`), glossy card surface gradient (`#ffffff` to `#f1f5f9`), sky blue border (`#0284c7`), scope fill tints.
- **Linear Gradients**:
  - `cloudmer-node-bg`: Card surface gradient.
  - `cloudmer-badge-bg`: Elevated icon container background gradient.
  - `cloudmer-sheen`: Top specular highlight sheen line (`#ffffff` with tapering opacity).
  - Scope border gradients per scope kind (`account`, `region`, `vpc`, `subnet`).

---

## 3. Resource Nodes & Scope Containers

### 3.1 Resource Node Cards (`<g class="cloudmer-node">`)
- **Dimensions & Radius**: Multi-layered card container (`rx="12" ry="12"`).
- **Sheen Line**: 1px specular highlight at the top edge (`<line x1="2" y1="1" x2="width-2" y2="1" stroke="url(#cloudmer-sheen)"/>`).
- **Icon Badge Frame**: 44x44px rounded badge container (`rx="8"`) with elevated drop shadow and soft gradient fill. Icon centered inside.
- **Typography**: Label rendered with modern font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), weight `600`, size `13px`, text-anchor `middle`.
- **Diagnostic States**: Diagnostic error/warning rings around the card with outer glow filter.

### 3.2 Tiered Scope Containers (`<g class="cloudmer-scope">`)
- **Scope Hierarchy Styling**:
  - `account`: Deep container, 2px dashed border, dark tint.
  - `region`: Rounded container (`rx="14"`), slate gradient fill.
  - `vpc`: Tech grid dashed border (`stroke-dasharray="6 4"`), soft blue tint.
  - `subnet`: Clean semi-transparent container (`rx="10"`), subtle stroke.
- **Header Pill Badges**: Floating header pill tag at top-left (`<g class="cloudmer-scope-pill">`) with:
  - Pill background rect (`rx="6" ry="6"`).
  - Scope type tag (e.g. `ACCOUNT`, `REGION`, `VPC`, `SUBNET`) in uppercase monospaced text.
  - Scope name in bold font.

---

## 4. Edge Routing & Marker Styling

### 4.1 Smooth Rounded Orthogonal Routing
- Algorithm translates straight 90° corner segments into quadratic Bezier arcs (`Q` control points) with a 12px corner radius.
- Smooth S-curve splines for direct diagonal connections.

### 4.2 Sleek Arrow Markers
- Redesigned SVG arrow markers (`markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"`).
- Smooth polygon shape with matching gradient/solid fill and marker shadow.

### 4.3 Embedded CSS Stylesheet
SVG contains an embedded `<style>` block:
- Micro-animations for hover scaling (`transform: translateY(-2px)`).
- Edge glowing on hover.
- Dash flow animations for relationship types.

---

## 5. Verification Plan

- Unit tests in `packages/renderer-svg/src/serializer/index.test.ts` verifying filter inclusion, smooth path rendering, scope badges, and theme structure.
- Playground verification in `apps/playground` ensuring diagrams render with wow aesthetics across LR/TB layouts and dark/light themes.
