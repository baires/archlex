# ArchLex Playground Focused Workspace Design

**Date:** 2026-07-31
**Status:** Approved design, pending implementation plan

## Context

The ArchLex playground is a reference consumer and debugging environment for developers, DevOps engineers, SREs, and cloud engineers. Its current interface gives the brand, configuration, export actions, editor, preview controls, status, and diagnostics similar visual weight. A single informational diagnostic can consume a large horizontal band, reducing the usable editor and canvas area.

The current styling also relies on gradients, glass blur, glow, rounded cards, emoji, and decorative entrance animations. These choices make the product feel like a generic SaaS dashboard rather than a precise infrastructure tool.

## Goals

- Make authoring the default through a calm, resizable editor-first split workspace.
- Preserve maximum room for source and rendered architecture.
- Make diagnostics easy to find without allowing warnings or informational messages to interrupt work.
- Provide a true distraction-free rendering mode suitable for inspection and presentation.
- Establish an honest visual language for DevOps, SRE, and cloud engineering audiences.
- Preserve the current rendering contract, partial-output behavior, selection synchronization, local persistence, and SVG export.

## Non-goals

- Monaco integration or new language tooling.
- Direct manipulation of diagram nodes.
- New export formats.
- Accounts, sharing, collaboration, or backend persistence.
- A broad playground feature expansion unrelated to focus and hierarchy.

## Chosen Direction

The chosen direction is a focused workspace redesign. It changes information architecture and interaction hierarchy while keeping existing rendering behavior. It is intentionally more substantial than a cosmetic reskin and less complex than moving the application into a command-palette-first model.

The visual direction is an **operations console**: near-black neutral surfaces, crisp dividers, compact typography, a restrained sea-glass accent, and severity colors used only for system state. The memorable quality should be the absence of unnecessary interface chrome around a dense, trustworthy architecture workspace.

## Workspace Architecture

The application has three persistent horizontal bands on desktop.

### Command Bar

The top command bar is 44–48 px tall. It contains:

- A compact ArchLex wordmark at the left.
- Example, layout direction, and validation controls.
- Theme, export, and fullscreen actions at the right.

Copy SVG and download SVG are grouped beneath one Export control. Text labels remain where they improve scanability; compact icon-only actions require an accessible name and tooltip.

### Main Workspace

The main workspace is a resizable editor and preview split, defaulting to 40% editor and 60% preview. The editor remains on the left and the preview remains on the right. Each pane has a small contextual header:

- The editor header identifies the current example or custom document.
- The preview header holds only view controls that are relevant outside fullscreen.

The split divider must be operable by pointer and keyboard. Its ratio persists locally and restores safely. A corrupted or out-of-range persisted ratio falls back to the default.

### Status Bar

A 24–28 px status bar occupies the bottom edge. It reports:

- Cursor or source-selection position when available.
- Diagnostic counts separated by error, warning, and information severity.
- Active provider.
- Render state and latest render duration.

The zero-diagnostic state is expressed by counts and does not render a separate success card or message.

### Narrow Layout

At the existing narrow breakpoint, the main workspace changes to Editor and Preview tabs. Diagnostics remain available through the shared status bar and drawer rather than becoming a third primary tab. Fullscreen preview is available from the Preview tab.

## Diagnostics

Diagnostics are summarized in the status bar and displayed in an on-demand drawer above it.

- Errors automatically open the drawer when a new render result arrives with at least one error.
- Warnings and informational diagnostics update their counts without opening the drawer or moving focus.
- The user can open or close the drawer at any time from the status bar.
- Closing an error-opened drawer is respected until a later render introduces a new error result.
- Opening the drawer never changes keyboard focus unless the user explicitly navigates into it.

The drawer renders compact rows rather than cards. Each collapsed row contains a severity marker, message, stable diagnostic code, and source line. Remediation expands beneath the selected row when available. Severity filters allow users to reduce the list without hiding the aggregate counts in the status bar.

Selecting a diagnostic synchronizes the related source span and diagram element using the existing element mapping. Rows without a related element still navigate to their source span when available. The list supports arrow-key navigation, Enter or Space to select, and Escape to close the drawer and return focus to its trigger.

Internal render failures are visually distinct from semantic diagnostics. They preserve the last successful SVG and appear as an error row with concise recovery context.

## Fullscreen Preview

Fullscreen preview is a distraction-free canvas mode. Entering it hides the command bar, editor, pane headers, diagnostics drawer, and status bar. The preview occupies the full application viewport.

A small floating control cluster in the top-right corner provides:

- Zoom out.
- Current zoom percentage.
- Zoom in.
- Fit to viewport.
- Exit fullscreen.

Panning and wheel or trackpad zoom remain available. Escape exits fullscreen. Exiting restores the exact prior split ratio, drawer state, selected element, zoom, and pan position.

The mode uses the browser Fullscreen API when available and permitted. If unavailable or rejected, the app falls back to an in-app viewport takeover with identical controls and exit behavior. A rejected browser fullscreen request is not treated as a render failure.

## Visual System

### Color

- Near-black neutral surfaces define the application and editor.
- One-pixel neutral dividers establish structure.
- Sea-glass green is reserved for focus, selection, and primary actions.
- Red, amber, and blue are reserved for error, warning, and information states.
- Light theme remains supported using the same hierarchy and restrained accent usage.
- Official provider icons retain their official colors.

Gradients, glass blur, glow, decorative shadows, and multi-color brand effects are excluded.

### Typography

- Bundle IBM Plex Sans for interface labels and prose.
- Bundle IBM Plex Mono for source, diagnostic codes, timing, coordinates, and status metadata.
- Use tabular numerals for zoom, line and column, counts, and render duration.
- Reserve uppercase for terse system labels; normal prose remains sentence case.

The fonts are packaged with the application through local assets or `@fontsource` dependencies. The playground must not make a runtime font request.

### Shape and Motion

Controls use small corner radii or square geometry consistently. Diagnostics are rows, not floating cards. Motion is limited to functional state changes: drawer opening, split resizing, and a brief render-state transition. All motion respects `prefers-reduced-motion`.

Emoji are not used as interface icons. Icons must come from one consistent, accessible icon set or purpose-built SVGs.

## Component Model

The redesign introduces or refines these boundaries:

- `CommandBar`: global configuration and primary actions.
- `Workspace`: desktop split, narrow tabs, split persistence, and fullscreen restoration.
- `EditorPane`: source editing and source-side selection.
- `PreviewPane`: SVG mounting, selection, pan, zoom, fit, and fullscreen controls.
- `StatusBar`: provider, position, diagnostics, render state, and timing.
- `DiagnosticsDrawer`: filtering, rows, remediation, keyboard navigation, and selection.
- `ExportMenu`: copy SVG and download SVG actions.

`App` owns source, render output, diagnostics, selected element, rendering state, and persisted user preferences. `Workspace` owns transient split-drag, active narrow tab, drawer, and fullscreen restoration state. Components receive explicit data and callbacks and do not call the renderer directly.

## Data and State Flow

Source or option changes continue through the existing 150 ms debounced render pipeline. A new render aborts its predecessor. The previous successful SVG remains visible while a render is pending.

A completed render updates the SVG, diagnostics, provider metadata, and measured duration as one UI result. Validation errors can produce and display partial output. Selection continues to synchronize between source, SVG elements, and diagnostics.

Persisted preferences include theme, direction, validation mode, source, and desktop split ratio. Fullscreen and drawer openness are transient and are never restored on page load.

Clipboard and download failures report through a temporary status-bar message. They do not use browser alerts and do not replace the render state.

## Accessibility

- Every action is keyboard operable and has an accessible name.
- The split divider exposes separator semantics and keyboard resizing.
- Diagnostic count changes are announced without replaying every diagnostic.
- Error-triggered drawer opening does not steal focus.
- Escape returns focus to the control that opened a drawer or fullscreen mode.
- Focus remains visible and uses the sea-glass focus token with sufficient contrast.
- Fullscreen controls remain reachable in a predictable tab order.
- Narrow tabs expose correct tab and tabpanel relationships.
- Reduced-motion preferences disable nonessential transitions.

## Testing and Acceptance Criteria

### Functional

- Desktop opens in an editor-left, preview-right split near 40/60.
- Pointer and keyboard resizing work and a valid ratio survives reload.
- Errors open the diagnostics drawer; warnings and information do not.
- Clicking diagnostic counts opens the drawer with the matching filter.
- A diagnostic row synchronizes source and diagram selection.
- Entering and exiting fullscreen restores split, drawer, selection, zoom, and pan state.
- Fullscreen falls back to an in-app takeover when the Fullscreen API is unavailable or rejects.
- Export contains the latest successful SVG and excludes playground-only selection styling.
- Narrow layouts provide Editor and Preview tabs with shared diagnostic access.

### Visual and Responsive

- Dark and light themes use the operations-console hierarchy.
- No gradient, glass, glow, emoji control, oversized card, or decorative entrance animation remains.
- Browser snapshots cover desktop and narrow layouts in both themes, diagnostics closed/open, error state, and fullscreen preview.

### Regression

- The debounced abortable render loop remains correct.
- Partial diagrams remain visible for expected validation errors.
- Internal errors retain the prior successful diagram.
- Existing two-way selection synchronization remains intact.
- Existing browser and integration tests continue to pass after selectors are updated deliberately.

## Implementation Sequence

The later implementation plan should stage the work as follows:

1. Establish design tokens, typography, icon treatment, and base workspace geometry.
2. Introduce `CommandBar`, `StatusBar`, and `ExportMenu` without changing render behavior.
3. Add the resizable `Workspace` and responsive Editor/Preview tabs.
4. Replace the current diagnostics panel with the status summary and drawer policy.
5. Add fullscreen preview and state restoration.
6. Complete accessibility, responsive, interaction, and visual-regression coverage.

Each stage should keep the playground runnable and preserve public core-library behavior.
