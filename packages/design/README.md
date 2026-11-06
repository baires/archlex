# @archlex/design

Shared visual primitives for ArchLex applications.

Import `@archlex/design` before an application's local stylesheet. The entry
point loads fonts, structural tokens, and semantic theme colors in that order.

## Fonts

- **Display**: Bricolage Grotesque Variable (locally hosted)
- **UI**: Instrument Sans Variable (locally hosted)
- **Code and monospace**: Commit Mono

Use `--font-display`, `--font-ui`, and `--font-code` to reference the font roles.

## Theming

Set `data-theme="light"` or `data-theme="dark"` on the document root for an
explicit theme. When `data-theme` is absent, the design system follows
`prefers-color-scheme` (System).

Use semantic roles such as `--surface-canvas`, `--text-primary`, and `--signal`
instead of palette-specific names or raw color values. Applications own their
component and layout CSS; this package does not ship buttons, grids, or page
components.

## Tokens

Structural primitives include `--radius-control` (999px pill), `--radius-code` (10px),
`--radius-panel` (12px), spacing scale `--space-1` through `--space-9`, focus geometry,
and motion durations.

Compatibility aliases preserve the existing playground token contract during gradual adoption.

## Logo

`assets/logo.svg` is the canonical ArchLex
owl logo. It is theme-adaptive: dark artwork on light color schemes, light artwork
on dark ones, via `prefers-color-scheme`. `assets/apple-touch-icon.png` is the
180×180 iOS home-screen icon (dark owl on `--surface-canvas` light). Each app serves
copies of both as its favicons (`apps/*/public/favicon.svg`, `apple-touch-icon.png`,
and `apple-touch-icon-precomposed.png`); update those copies when the logo changes.
App headers render the same artwork inline with `fill="currentColor"` so it follows
the manual theme toggle — keep those inline copies in sync with this file too.

## Status and overflow

Use --status-warning and --status-warning-surface for semantic warnings in both themes. Always accompany color with readable status text. --text-secondary meets AA on the shared light surfaces. The package provides a visible, theme-aware scrollbar baseline for owned overflow regions using --scrollbar-thumb and --scrollbar-track; forced colors use system scrollbars.

Visual intent and application register are documented in the root DESIGN.md. Runtime values in this package remain canonical. The landing and playground share these values while owning their layout and interaction components.
