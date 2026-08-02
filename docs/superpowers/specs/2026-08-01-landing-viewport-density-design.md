# Landing Viewport Density Design

## Goal

Make the landing page feel tighter and more intentional, with the product proposition and a fully readable ArchLex render visible within the first desktop viewport.

## Approved Direction

Use the **Signal-dense viewport** composition. Keep the existing dark signal-console visual language and split-screen product frame, but reduce unused vertical space and give the rendered diagram more usable area.

## Hero Copy

- Eyebrow: `OPEN SOURCE · AWS + GCP`
- Headline: `Write the architecture. We’ll check it.`
- Supporting line: `Turn concise cloud text into a validated, accessible diagram—right in your browser.`
- Primary action: `Try the playground`
- Secondary action: `View source`
- Proof row: `AWS + GCP · semantic checks · deterministic SVG · no sign-up`

The tone must be direct, indie, technical, and free of enterprise language.

## Hero Layout

- On desktop viewports at least 1060px wide, the header and complete hero must fit within `100svh` without clipping the product frame.
- The hero remains a two-column composition with a compact copy column and a larger product column.
- Reduce the headline scale enough to avoid excessive wrapping while retaining its editorial character.
- Reduce hero top and bottom padding and tighten gaps between eyebrow, headline, support copy, actions, and proof.
- Reduce the product workspace height and render the diagram with `object-fit: contain` so the entire architecture is visible.
- Narrow the source pane relative to the rendered diagram.
- On mobile, stack copy above the render, hide the source pane, and show the complete diagram directly after the actions.

## Page Rhythm

- Reduce oversized section padding throughout the page.
- Tighten section-marker and content gaps.
- Preserve borders as the primary section separator.
- Keep enough whitespace for scanning, but remove empty bands that do not create hierarchy.
- Do not restructure or rewrite lower-page content beyond spacing adjustments.

## Accessibility and Responsiveness

- Preserve skip navigation, keyboard focus, reduced-motion behavior, and semantic landmarks.
- Maintain zero horizontal overflow at 1440px and 390px.
- Keep hero actions visible without scrolling at a 1440×900 viewport.
- At 1440×900, the complete hero product frame must fit within the viewport below the header.
- The render image must use `object-fit: contain` at desktop and mobile widths.

## Verification

- Add Playwright assertions for the approved headline and CTA copy.
- Add a desktop viewport assertion that the product frame bottom is within the viewport.
- Assert the render image uses `object-fit: contain`.
- Retain the existing accessibility, GitHub-link, and overflow tests.
- Visually inspect at 1440×900 and 390×844.

## Scope

This pass changes landing-page copy, hero sizing, render treatment, and section spacing only. It does not change application behavior, design tokens, playground functionality, documentation content, or the renderer output.
