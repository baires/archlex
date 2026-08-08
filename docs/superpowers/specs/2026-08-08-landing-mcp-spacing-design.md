# Landing MCP Spacing Design

## Goal

Make the MCP showcase in landing-page story row 03 feel compact, deliberate, and consistent with ArchLex's quiet technical-ledger aesthetic. The change is limited to spacing and control proportions; content, behavior, typography, colors, and information architecture remain unchanged.

## Diagnosis

The showcase currently combines 32px card padding with repeated 24–32px vertical gaps. Its tab and copy controls also apply large control padding on top of a 44px minimum height. Inside the narrow third column of the story grid, these values accumulate into an oversized card with uneven visual rhythm and pill-shaped controls that overpower their labels.

## Design

- Reduce desktop card padding to 24px and mobile card padding to 16px.
- Use a consistent 16–20px rhythm between the introduction, client tabs, setup content, agent prompt, example, proof line, and final link.
- Reduce the divider section's vertical spacing so it separates the two setup paths without creating a large dead zone.
- Give desktop tabs and copy controls a compact visual height and tighter inline padding.
- Preserve at least 44px touch targets for controls at mobile widths.
- Keep the tab row horizontally scrollable on narrow screens.
- Preserve code-block overflow behavior and all existing accessibility semantics, keyboard navigation, copy behavior, and reduced-motion behavior.

## Verification

- Add a browser regression assertion for the intended desktop card padding and compact pill proportions.
- Retain the existing mobile overflow and MCP interaction tests.
- Run the focused landing browser suite, landing type/build checks as available, and inspect desktop and mobile screenshots.

## Non-goals

- No copy changes.
- No component restructuring or new interaction patterns.
- No changes to other story rows or global control styling.
- No redesign of the site typography, theme, or color palette.
