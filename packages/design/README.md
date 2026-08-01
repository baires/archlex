# @archlex/design

Shared visual primitives for ArchLex applications.

Import `@archlex/design` before an application's local stylesheet. The entry
point loads fonts, structural tokens, and semantic theme colors in that order.

Use semantic roles such as `--surface-canvas`, `--text-primary`, and `--signal`
instead of palette-specific names or raw color values. Applications own their
component and layout CSS; this package does not ship buttons, grids, or page
components.

Set `data-theme="light"` or `data-theme="dark"` on an application root for an
explicit theme. When no explicit theme is present, system color preference is
used. Compatibility aliases preserve the existing playground token contract
during gradual adoption.
