# Playground Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce transparent SVG/PNG exports and redesign the playground preview as a token-driven patterned canvas with embedded controls and canvas-only pointer-anchored zoom.

**Architecture:** Remove the renderer-owned background primitive so transparency is intrinsic to every generated SVG. Keep presentation and interaction in the playground: pure transform helpers calculate anchored zoom, `Preview` wires a non-passive native wheel listener, and CSS supplies the design-token-based dot grid and overlays.

**Tech Stack:** TypeScript, React 19, SVG, Canvas 2D, Vitest, Vite, and CSS custom properties from `@archlex/design`.

## Global Constraints

- Generated SVG and PNG exports preserve transparency behind diagram content.
- The playground pattern is never serialized into or painted onto exports.
- Preview chrome is embedded within the canvas and consumes no layout height.
- UI styling uses `packages/design` tokens and works in light and dark themes.
- Pinch gestures inside the preview zoom only the diagram; outside behavior is unchanged.
- Pan, selection, fit, reset, fullscreen, keyboard, empty-state, and accessible labels remain available.

---

## File structure

- `packages/renderer-svg/src/serializer/index.ts`: transparent SVG serialization.
- `packages/renderer-svg/src/serializer/index.test.ts`: direct transparency contract.
- `packages/core/src/index.test.ts`: themed-render integration contract.
- `apps/playground/src/utils/export.test.ts`: transparent PNG regression coverage.
- `apps/playground/src/components/preview-transform.ts`: pure anchored-zoom math.
- `apps/playground/src/components/preview-transform.test.ts`: transform tests.
- `apps/playground/src/components/Preview.tsx`: event wiring and embedded overlays.
- `apps/playground/src/components/preview-layout.test.ts`: UI source contract.
- `apps/playground/src/styles.css`: patterned canvas and token-based presentation.

### Task 1: Transparent renderer output

**Files:**
- Modify: `packages/renderer-svg/src/serializer/index.test.ts`
- Modify: `packages/renderer-svg/src/serializer/index.ts`
- Modify: `packages/core/src/index.test.ts`

**Interfaces:**
- Consumes: `serializeSvgGraph(graph, diagnostics?, theme?)` and `createArchLex().render(source, { theme })`.
- Produces: SVG strings without a `.archlex-canvas` element or theme background fill.

- [ ] **Step 1: Write the failing serializer test**

```ts
it("leaves the diagram canvas transparent", () => {
  const result = serializeSvgGraph({
    width: 300,
    height: 200,
    nodes: [],
    edges: [],
  });
  expect(result.svg).not.toContain("archlex-canvas");
  expect(result.svg).not.toContain('fill="#ffffff"');
});
```

Replace the core assertions expecting light/dark canvas rectangles with assertions that both omit `archlex-canvas` while retaining theme-dependent diagram colors.

- [ ] **Step 2: Verify the test fails for the current background rectangle**

```bash
pnpm --filter @archlex/renderer-svg test -- src/serializer/index.test.ts
pnpm --filter @archlex/core test -- src/index.test.ts
```

Expected: the transparency assertion fails on `<rect class="archlex-canvas">`.

- [ ] **Step 3: Remove the rectangle from `fullSvg`**

Delete only:

```ts
  <rect class="archlex-canvas" width="100%" height="100%" fill="${theme.background}"/>
```

Keep `theme.background` because diagram-local marker details still consume it.

- [ ] **Step 4: Run both focused suites and commit**

```bash
pnpm --filter @archlex/renderer-svg test -- src/serializer/index.test.ts
pnpm --filter @archlex/core test -- src/index.test.ts
git add packages/renderer-svg/src/serializer/index.ts packages/renderer-svg/src/serializer/index.test.ts packages/core/src/index.test.ts
git commit -m "fix: export diagrams with transparent backgrounds"
```

Expected: tests pass before the commit.

### Task 2: Transparent PNG export regression

**Files:**
- Create: `apps/playground/src/utils/export.test.ts`
- Verify: `apps/playground/src/utils/export.ts`

**Interfaces:**
- Consumes: `svgToPng(svgString: string, scale?: number): Promise<string>`.
- Produces: proof that rasterization does not paint the canvas before `drawImage`.

- [ ] **Step 1: Add a controlled browser-boundary test**

Install a fake `Image` whose `src` setter invokes `onload` with dimensions 100×50, mock object-URL methods, and return a canvas-like object from `document.createElement("canvas")`. Its context tracks `scale`, `drawImage`, and `fillRect`:

```ts
it("draws the SVG onto an untouched transparent canvas", async () => {
  const fillRect = vi.fn();
  const drawImage = vi.fn();
  // Install Image, URL, canvas, and 2D context fakes.
  const result = await svgToPng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>',
    2,
  );
  expect(fillRect).not.toHaveBeenCalled();
  expect(drawImage).toHaveBeenCalledTimes(1);
  expect(result).toBe("data:image/png;base64,transparent");
});
```

Restore global replacements and spies in `afterEach`.

- [ ] **Step 2: Prove the test detects opacity**

Temporarily add `ctx.fillRect(0, 0, width, height)` before `drawImage`, run:

```bash
pnpm --filter @archlex/playground test -- src/utils/export.test.ts
```

Expected: FAIL because `fillRect` was called. Remove only the temporary line.

- [ ] **Step 3: Run against the existing conversion and commit**

```bash
pnpm --filter @archlex/playground test -- src/utils/export.test.ts
git add apps/playground/src/utils/export.test.ts
git commit -m "test: preserve transparent PNG exports"
```

Expected: PASS because the Canvas 2D backing store is untouched before drawing.

### Task 3: Pointer-anchored canvas zoom

**Files:**
- Modify: `apps/playground/src/components/preview-transform.test.ts`
- Modify: `apps/playground/src/components/preview-transform.ts`
- Modify: `apps/playground/src/components/Preview.tsx`

**Interfaces:**
- Produces: `calculateAnchoredZoom(scale: number, pan: Point, anchor: Point, nextScale: number): { scale: number; pan: Point }`.

- [ ] **Step 1: Write failing pure transform tests**

```ts
it("keeps the diagram point beneath the pointer fixed while zooming", () => {
  expect(
    calculateAnchoredZoom(1, { x: 0, y: 0 }, { x: 120, y: -60 }, 1.5),
  ).toEqual({ scale: 1.5, pan: { x: -60, y: 30 } });
});

it("uses the clamped scale to calculate anchored pan", () => {
  const result = calculateAnchoredZoom(
    2.9,
    { x: 10, y: 20 },
    { x: 100, y: 100 },
    4,
  );
  expect(result.scale).toBe(3);
  expect(result.pan.x).toBeCloseTo(6.8966);
  expect(result.pan.y).toBeCloseTo(17.2414);
});
```

- [ ] **Step 2: Verify the missing export fails**

```bash
pnpm --filter @archlex/playground test -- src/components/preview-transform.test.ts
```

Expected: FAIL because `calculateAnchoredZoom` is not exported.

- [ ] **Step 3: Implement the pure helper**

```ts
interface Point {
  x: number;
  y: number;
}

export function calculateAnchoredZoom(
  scale: number,
  pan: Point,
  anchor: Point,
  nextScale: number,
): { scale: number; pan: Point } {
  const clampedNextScale = clampScale(nextScale);
  const ratio = clampedNextScale / scale;
  return {
    scale: clampedNextScale,
    pan: {
      x: anchor.x - (anchor.x - pan.x) * ratio,
      y: anchor.y - (anchor.y - pan.y) * ratio,
    },
  };
}
```

- [ ] **Step 4: Run the transform suite**

```bash
pnpm --filter @archlex/playground test -- src/components/preview-transform.test.ts
```

Expected: PASS.

- [ ] **Step 5: Wire the non-passive native listener**

Remove React `WheelEvent` and JSX `onWheel`. In `Preview`, maintain a `panRef` whenever pan changes, and attach `wheel` to `viewportRef.current` with `{ passive: false }`. The handler calls `preventDefault()`, calculates the pointer position relative to viewport center, and calls `calculateAnchoredZoom`. Use a 0.08 step for `ctrlKey` pinch events and 0.1 otherwise. Cleanup with `removeEventListener`.

- [ ] **Step 6: Verify and commit**

```bash
pnpm --filter @archlex/playground test
pnpm --filter @archlex/playground typecheck
git add apps/playground/src/components/preview-transform.ts apps/playground/src/components/preview-transform.test.ts apps/playground/src/components/Preview.tsx
git commit -m "fix: contain trackpad zoom within preview canvas"
```

### Task 4: Embedded preview chrome and token-driven canvas

**Files:**
- Create: `apps/playground/src/components/preview-layout.test.ts`
- Modify: `apps/playground/src/components/Preview.tsx`
- Modify: `apps/playground/src/styles.css`

**Interfaces:**
- Consumes: shared surface, border, text, signal, spacing, radius, duration, focus, and shadow CSS variables.
- Produces: a full-height patterned viewport with top-left label and top-right controls.

- [ ] **Step 1: Add a failing source contract**

```ts
it("embeds preview chrome inside the diagram canvas", () => {
  expect(previewSource).not.toContain('<div className="pane-header">');
  expect(previewSource).toContain('className="preview-canvas-label"');
  expect(previewSource).toContain('className="preview-overlay"');
  expect(styles).toContain("radial-gradient(");
  expect(styles).toContain("var(--border-subtle)");
});
```

Read both source files with `readFileSync(new URL(..., import.meta.url), "utf8")`.

- [ ] **Step 2: Verify the structural test fails**

```bash
pnpm --filter @archlex/playground test -- src/components/preview-layout.test.ts
```

Expected: FAIL because the pane header remains and overlay classes do not exist.

- [ ] **Step 3: Move preview chrome into the viewport**

Delete the Preview `.pane-header`. Inside `.preview-viewport`, render `.preview-canvas-label` and `.preview-overlay`. Reuse one zoom cluster in normal and fullscreen modes; the final action is actual-size normally and exit-fullscreen in fullscreen. Preserve the focus ref and all accessible names.

- [ ] **Step 4: Apply shared-token canvas styling**

Remove duplicate local palette values already supplied by `@archlex/design`. Add a 20px `radial-gradient` dot grid over `--surface-canvas`; absolutely position badge and overlay with `--space-3`; use translucent `--surface-raised`, `--border-subtle`, `--radius-panel`, restrained `--shadow-raised`, and `backdrop-filter: blur(12px)`. Hover/focus use `--surface-sunken`, `--signal`, and `--focus-ring`. Remove obsolete preview-header/fullscreen rules and disable stage transition under `prefers-reduced-motion`.

- [ ] **Step 5: Verify component and build behavior**

```bash
pnpm --filter @archlex/playground test
pnpm --filter @archlex/playground typecheck
pnpm --filter @archlex/playground build
```

Expected: all commands pass.

- [ ] **Step 6: Browser-check desktop/mobile and light/dark**

Run `pnpm dev:playground`. At roughly 1440×900 and 390×844, confirm transparent diagram bounds, canvas-top alignment, unobtrusive overlays, cursor-anchored wheel/pinch zoom without page zoom, and preserved pan, selection, fit, reset, fullscreen, focus, empty state, and responsive tabs.

- [ ] **Step 7: Commit**

```bash
git add apps/playground/src/components/Preview.tsx apps/playground/src/components/preview-layout.test.ts apps/playground/src/styles.css
git commit -m "style: embed controls in playground canvas"
```

### Task 5: Repository verification

**Files:** Verify all files changed in Tasks 1–4.

- [ ] **Step 1: Run fresh focused verification**

```bash
pnpm --filter @archlex/renderer-svg test
pnpm --filter @archlex/core test
pnpm --filter @archlex/playground test
pnpm --filter @archlex/playground typecheck
pnpm --filter @archlex/playground build
```

- [ ] **Step 2: Run lint and diff checks**

```bash
pnpm exec biome check packages/renderer-svg/src/serializer/index.ts packages/renderer-svg/src/serializer/index.test.ts packages/core/src/index.test.ts apps/playground/src/utils/export.test.ts apps/playground/src/components/preview-transform.ts apps/playground/src/components/preview-transform.test.ts apps/playground/src/components/Preview.tsx apps/playground/src/components/preview-layout.test.ts apps/playground/src/styles.css
git diff --check HEAD~4..HEAD
git status --short
```

Expected: commands exit 0 and no implementation files remain uncommitted.

- [ ] **Step 3: Review every Global Constraint**

Match each constraint to test output, browser observations, and the final diff. Report any unmet item explicitly rather than claiming completion.
