# Playground Framed Shell

## Goal

Give the playground consistent breathing room around the entire application and eliminate document-level horizontal and vertical scrolling at supported viewport sizes.

## Visual direction

Treat the playground as a precise instrument panel inset within the browser viewport. A 10px outer gutter exposes the canvas background around one cohesive application frame. The frame uses the existing strong border token and a restrained 4px radius; the header, workspace, diagnostics, and status bar remain visually connected inside it.

At narrow widths, reduce the gutter to 4px to preserve usable editor and preview space. No added padding belongs between the editor and preview because their shared splitter should remain exact.

## Layout behavior

`html`, `body`, and `#app` occupy the available viewport without document scrolling. The body contains the application frame and hides page-level overflow.

The application shell uses `height: calc(100dvh - 20px)`, `width: calc(100% - 20px)`, and matching margins to account for the desktop gutter inside the viewport. It also uses `min-width: 0` and `min-height: 0` so flex and grid descendants may shrink rather than expand the page.

At widths up to 760px, the shell continues to occupy the dynamic viewport instead of switching to `height: auto` and visible overflow. Its dimensions become `calc(100dvh - 8px)` and `calc(100% - 8px)` with 4px margins. Workspace tabs continue to switch between editor and preview, and internal panels own any necessary scrolling.

Fullscreen mode ignores the outer gutter and continues to fill the viewport edge to edge.

## Overflow ownership

- `body` and `.app-shell` never expose horizontal or vertical page scrollbars.
- The command bar remains one row and allows its context control to shrink.
- Monaco owns editor-content scrolling.
- `.preview-viewport` clips the transformed diagram and owns gesture interaction.
- The diagnostics list owns its vertical scrolling.
- Popovers may visually escape their trigger but remain positioned within the viewport.

## Accessibility and motion

The frame is decorative and adds no semantic wrapper or focus stop. Existing focus rings, skip navigation, keyboard tabs, and reduced-motion behavior remain unchanged.

## Verification

Browser tests will assert that `documentElement.scrollWidth === documentElement.clientWidth` and `documentElement.scrollHeight === documentElement.clientHeight` at desktop, browser-zoom-like intermediate, and narrow widths. They will also verify the expected shell inset, retained 44–48px header height, narrow editor/preview tabs, and edge-to-edge fullscreen mode.

Visual inspection will cover light and dark themes at desktop and narrow widths, confirming a balanced frame, no clipped focus rings, no page-level scrollbars, and unchanged internal editor/preview geometry.
