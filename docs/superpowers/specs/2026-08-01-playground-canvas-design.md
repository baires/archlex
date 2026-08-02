# Playground Canvas Refinement

## Goal

Make the playground preview feel like a single diagram workspace rather than a panel with unrelated chrome. Generated SVG and PNG exports must be transparent, while the interactive playground canvas provides its own subtle design-token-driven backdrop.

## Visual direction

Use a restrained technical-canvas aesthetic consistent with `packages/design`. Remove the full-width Preview header. Place a compact Preview badge at the top-left of the canvas and a translucent zoom control cluster at the top-right. Both overlays sit within the canvas, use shared design tokens, and retain sufficient contrast in light and dark themes.

The canvas uses a subtle dot grid or comparably quiet line pattern derived from the shared surface and border tokens. The pattern belongs only to the playground viewport and must never appear in exported diagrams.

## Renderer and exports

The SVG renderer will stop emitting the full-viewBox `.archlex-canvas` background rectangle. The SVG root and diagram content remain otherwise unchanged. SVG exports therefore have no background element. PNG export continues to rasterize the SVG without adding a fill, preserving transparent pixels behind the diagram.

Renderer tests will assert that generated diagrams do not contain the canvas rectangle or a theme background fill. Export tests will assert that the PNG conversion path does not paint a background before drawing the SVG.

## Playground layout

The editor retains its existing Source header. The preview panel has no header row, so its canvas begins at the top of the workspace panel. A small non-interactive Preview badge provides orientation without consuming layout height. The zoom controls and rendering status are positioned over the canvas and do not affect the diagram's centering or fit calculations.

The overlay controls reuse `packages/design` variables for surfaces, borders, text, focus, spacing, radius, transitions, and shadows. Playground-local hard-coded color aliases will be removed where the shared package already supplies the equivalent token.

## Zoom and pan behavior

Pointer dragging continues to pan the diagram. Wheel and trackpad gestures over the preview viewport are intercepted with a non-passive native wheel listener so `preventDefault()` reliably prevents browser page zoom.

Regular wheel input zooms the diagram. Browser-reported pinch gestures, typically represented as `wheel` events with `ctrlKey`, also zoom only the diagram. Zoom is anchored to the pointer position: the diagram point beneath the cursor remains beneath the cursor as scale changes. Scale remains clamped to the existing supported range. Gestures outside the preview viewport retain normal browser behavior.

Zoom buttons, fit-to-viewport, actual-size reset, fullscreen controls, keyboard focus, and accessible names remain available. Fullscreen uses the same embedded control treatment rather than a separate visual system.

## Component boundaries

- `packages/renderer-svg` owns transparent SVG generation.
- The playground export utility owns transparent PNG conversion behavior.
- Pure preview-transform helpers own scale clamping and cursor-anchored zoom calculations.
- `Preview` owns canvas event wiring, pan/zoom state, and overlay controls.
- Playground CSS owns the dot grid and token-based presentation.

## Error and empty states

Existing render-error handling remains unchanged. The empty state appears over the patterned canvas with the same embedded Preview badge. Controls appear only when a diagram is available, while rendering status remains visible without changing canvas geometry.

## Verification

Implementation will follow test-first changes. Verification includes focused renderer, export, and transform tests; the playground test suite; type checking; production builds; linting of touched files; and browser inspection at desktop and responsive widths in light and dark themes. Visual inspection must confirm transparent diagram bounds, equal editor/preview workspace alignment, unobtrusive overlays, and canvas-only pinch zoom.
