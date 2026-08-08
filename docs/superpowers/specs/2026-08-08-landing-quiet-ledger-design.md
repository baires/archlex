# ArchLex Landing — Quiet Ledger Redesign

## Summary

Redesign `apps/landing` around a refined, minimal direction called **Quiet Ledger**. The site should borrow Ollama's restraint—near-monochrome color, generous whitespace, simple pill actions, and minimal borders—without copying its layout or brand expression.

The redesign may simplify, remove, and reorder the current landing content. Its conversion priorities are:

1. Open the Playground.
2. Connect the ArchLex MCP server.
3. Install and use ArchLex packages.

The reusable visual decisions belong in `@archlex/design`; the landing-specific composition remains in `apps/landing`.

## Goals

- Make the Playground the unmistakable primary action.
- Explain ArchLex's semantic advantage before listing implementation details.
- Give the MCP server a strong secondary path without letting its setup UI dominate the page.
- Keep package installation available as a compact tertiary path.
- Support system-first light and dark modes with an explicit, remembered override.
- Reduce decorative borders, panels, gradients, and chrome while preserving clear hierarchy.
- Maintain accessibility, responsive behavior, and graceful no-JavaScript rendering.

## Non-goals

- Redesigning the Playground, documentation, or MCP product interfaces.
- Adding account, pricing, search, analytics, or backend functionality.
- Copying Ollama's mascot, illustrations, page content, or exact component styling.
- Turning all shared applications into the Quiet Ledger page layout.

## Design Direction

Quiet Ledger uses centered confidence rather than visual density. Large areas of open canvas frame a small number of carefully ordered ideas. Architecture diagrams appear directly on the page without window chrome. Numbered editorial rows explain the product in a calm sequence.

The memorable ArchLex signature is a borderless semantic architecture diagram suspended in whitespace, followed by concise validation evidence. The diagram is not decoration: it demonstrates that ArchLex understands typed cloud relationships.

### Visual principles

- Warm, near-white paper in light mode and charcoal rather than black in dark mode.
- Near-black or soft-white primary text with one restrained green semantic signal.
- Green is reserved for validation, focus, and small orientation cues.
- Pill geometry is reserved for primary actions and compact controls.
- Content sections have no card container or enclosing border.
- Code and interactive data surfaces use a subtle filled background and an 8–12px radius.
- Motion is limited to a coordinated entrance and small interaction feedback.
- Reading measure stays narrow even when diagrams use a wider stage.

## Shared Design Package

`packages/design` owns the reusable foundation:

- `fonts.css`: UI/display and code/meta font roles. Use Instrument Sans for UI and display text and Commit Mono for source, metadata, and technical labels. Load both locally through package dependencies and retain generic sans-serif and monospace fallbacks.
- `tokens.css`: spacing primitives, control and code-surface radii, focus dimensions, and motion timing.
- `themes.css`: semantic light and dark surface, text, border, signal, status, focus, diagram, and shadow values.
- Existing semantic token names remain the public contract. Add aliases when a new role is needed; do not rename or remove current variables in this redesign.

The target palette is:

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#f8f8f4` | `#11120f` |
| Primary text | `#171814` | `#f0f1eb` |
| Secondary text | `#6e7068` | `#a1a39a` |
| Subtle surface | `#ecece6` | `#24251f` |
| Semantic signal | `#356d12` | `#a9e876` |

The shared package defines visual primitives and semantic roles only. It must not contain landing-specific section selectors, page layout, copy, or responsive composition.

## Page Structure

### 1. Header

- ArchLex wordmark at the left.
- Docs, GitHub, and theme control as quiet secondary actions.
- Playground as the only filled primary action.
- No enclosing border or sticky glass treatment.
- At widths below 720px, the Playground and theme control remain visible while Docs and GitHub leave the header and remain available in the footer.

### 2. Hero

- Kicker: “Cloud architecture, understood.”
- Headline: “Diagrams that know what they mean.”
- Short explanation focused on text input, semantic checks, and trustworthy output.
- Primary action: Open Playground.
- Secondary action: Connect MCP.
- No proof-chip row or decorative frame.

### 3. Borderless diagram moment

- A real ArchLex architecture SVG appears directly on the canvas.
- A faint theme-aware radial field separates the diagram from the canvas without a browser-window frame, outline, or heavy shadow.
- Alternative text describes the represented system and purpose.

### 4. Numbered product story

The main narrative uses four numbered rows:

1. **Not just boxes.** Explain provider-aware resources, boundaries, and typed relationships. Show concise validation evidence.
2. **Readable in code review.** Pair concise ArchLex source with deterministic, accessible SVG output.
3. **Cloud judgment for your agent.** Present a condensed MCP setup with client selection, one copyable command or configuration, one example prompt, and a documentation link.
4. **Use it anywhere.** Present Browser and Node support, AWS and GCP providers, installation, and a minimal API example.

These rows replace the current collection of large proof, capability, MCP, source-to-system, and quick-start panels. Existing useful content is consolidated rather than duplicated.

### 5. Final action

- Short open-source/no-account cue.
- Headline: “See your architecture clearly.”
- Primary action: Open Playground.
- Secondary action: Read the docs.

### 6. Footer

- Compact wordmark/copyright.
- Docs, GitHub, MCP, and contribution links.
- No multi-column marketing sitemap unless the content requires it.

## Components and Boundaries

The implementation should keep Astro components small and purpose-specific:

- `SiteHeader`: navigation, primary action, and theme control placement.
- `ThemeControl`: accessible system/light/dark selection and state announcement.
- `Hero`: hero copy and conversion actions.
- `DiagramStage`: borderless diagram presentation and accessible description.
- `StoryRow`: numbered narrative layout with a slot for proof, source, or setup content.
- `McpSetup`: accessible client tabs, copy action, fallback behavior, and guide link.
- `PackageQuickStart`: compact install and API example.
- `SiteFooter`: compact project navigation.

`index.astro` composes the ordered story. `SITE_ROUTES` remains the single source for cross-site destinations. Static content stays server-rendered; JavaScript only enhances theme selection, tabs, and copying.

## Theme Behavior and Data Flow

1. With no stored preference, the page follows `prefers-color-scheme`.
2. Before first paint, a small inline head script reads an explicit preference from local storage and sets `data-theme` only for `light` or `dark`.
3. The theme control offers System, Light, and Dark states.
4. Selecting System removes the stored override and `data-theme`, returning control to the operating system.
5. Selecting Light or Dark stores the explicit choice and updates `data-theme`.
6. When System is active, operating-system theme changes update the rendered theme automatically.
7. The page updates the browser theme color to match the active canvas.

Storage access is wrapped defensively. If it fails, theme selection still applies for the current page without breaking rendering.

## Interaction and Error Handling

- MCP tabs preserve proper tablist, tab, and tabpanel semantics with Arrow Left/Right, Home, and End keyboard behavior.
- Copy actions use the Clipboard API when available.
- If clipboard writing fails, the relevant source is selected and an `aria-live` message tells the visitor to copy manually.
- Theme controls have explicit accessible names and visible focus styles.
- Essential content and links remain available when JavaScript is disabled.
- Animations respect `prefers-reduced-motion` and never gate content visibility.
- Missing optional external routes, such as GitHub, omit the link without leaving spacing artifacts.

## Responsive Behavior

- The main reading column is capped at 48ch while diagram and code stages use the wider page shell.
- Below 720px, numbered rows stack into a single reading column with the index retained as orientation.
- Code blocks wrap by default and scroll internally when an unbroken command cannot fit; the page itself must not scroll horizontally.
- Diagrams scale to their container and simplify presentation rather than shrinking labels below legibility.
- Playground remains visible in the mobile header.
- Lower-priority header links remain discoverable in the footer.
- Interactive touch targets are at least 44px in each dimension.

## Accessibility

- Preserve the skip link and semantic landmark structure.
- Use one `h1` and an ordered heading hierarchy.
- Keep visible focus indicators with sufficient contrast in both themes.
- Maintain readable text contrast for primary, secondary, and signal colors.
- Give architecture images purposeful alternative text; decorative fields remain hidden from assistive technology.
- Announce copy results and theme changes without moving focus.
- Verify keyboard-only operation for all enhanced controls.

## Verification

Run the repository-required checks relevant to the change:

- `pnpm build:landing`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm --filter @archlex/design test`

Perform browser verification at 1440px and 390px viewport widths in both themes:

- System theme is honored with no stored override.
- Light and dark overrides persist across reloads.
- Returning to System removes the override.
- No visible theme flash occurs during initial load.
- Header, diagrams, numbered rows, MCP tabs, code blocks, and footer reflow without overlap or horizontal page scrolling.
- Keyboard navigation, focus visibility, tab behavior, copy success, and copy fallback work.
- Reduced-motion mode exposes all content without entrance animation.
- The console has no runtime errors.

## Success Criteria

- A first-time visitor can identify what ArchLex does and reach the Playground from the first viewport.
- The page communicates semantic validation before implementation details.
- MCP is clearly the second path and package installation the third.
- Both themes feel intentionally designed rather than mechanically inverted.
- Borders are absent from narrative layout and limited to controls or dense technical content that needs structure.
- Shared visual decisions are expressed through `@archlex/design`, while landing composition stays local to `apps/landing`.
