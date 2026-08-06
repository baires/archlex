# Playground Command Bar and Centered Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a quieter single-row command bar with diagram settings in an accessible popover and make all preview zoom gradual and viewport-centered.

**Architecture:** Keep zoom calculations in pure transform helpers and let `Preview` only translate browser input into those helpers. Extract diagram configuration into a focused `DiagramSettings` component while `CommandBar` retains product context and primary actions; CSS defines the visual hierarchy and responsive reductions.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, shared ArchLex design tokens, plain CSS.

## Global Constraints

- Keep ARCHLEX, Example, Import, and Export visible in the command bar.
- Move Layout direction and Validation mode into a labeled Settings popover.
- Keep theme and fullscreen as icon actions with accessible names and tooltips.
- Keep the command bar on one row at supported widths.
- Anchor trackpad, wheel, and button zoom at the geometric center of the preview viewport.
- Preserve existing pan during zoom; Fit Diagram and Actual Size retain their existing centering behavior.
- Use a damped, magnitude-sensitive wheel curve with a per-event cap and the existing scale limits of `0.25` and `3`.
- Add no production dependency and make no renderer, DSL, import/export data-flow, or persistence changes.

---

## File Structure

- Create `apps/playground/src/components/DiagramSettings.tsx`: settings trigger, popover state, outside-click and Escape behavior, focus return, and the layout/validation controls.
- Create `apps/playground/src/components/DiagramSettings.test.tsx`: source-level contract tests following the repository's current component-test convention.
- Modify `apps/playground/src/components/CommandBar.tsx`: compact example context and action composition.
- Modify `apps/playground/src/components/Icon.tsx`: add a settings/sliders glyph.
- Modify `apps/playground/src/components/Preview.tsx`: route wheel and button input through centered zoom.
- Modify `apps/playground/src/components/preview-transform.ts`: damped proportional wheel calculation and a viewport-center zoom helper.
- Modify `apps/playground/src/components/preview-transform.test.ts`: pure behavioral coverage for damping, caps, clamping, and centered pan.
- Modify `apps/playground/src/styles.css`: command-bar grouping, settings popover, responsive behavior, reduced motion.
- Modify `tests/browser/playground-workspace.spec.mjs`: end-to-end settings, header geometry, and centered wheel zoom assertions.

---

### Task 1: Damped Centered Zoom Math

**Files:**
- Modify: `apps/playground/src/components/preview-transform.ts`
- Test: `apps/playground/src/components/preview-transform.test.ts`

**Interfaces:**
- Produces: `calculateWheelZoomFactor(deltaY: number, isPinchGesture: boolean): number`
- Produces: `calculateCenteredZoom(scale: number, pan: Point, nextScale: number): { scale: number; pan: Point }`
- Retains: `calculateAnchoredZoom(scale: number, pan: Point, anchor: Point, nextScale: number)` for its general transform invariant.

- [ ] **Step 1: Replace the fixed-step test with failing damping and centered-anchor tests**

```ts
import {
  calculateAnchoredZoom,
  calculateCenteredZoom,
  calculateFitScale,
  calculateWheelZoomFactor,
  clampScale,
} from "./preview-transform.js";

it("scales wheel input proportionally and caps individual events", () => {
  expect(calculateWheelZoomFactor(-1, true)).toBeGreaterThan(1);
  expect(calculateWheelZoomFactor(-1, true)).toBeLessThan(
    calculateWheelZoomFactor(-12, true),
  );
  expect(calculateWheelZoomFactor(-1000, true)).toBe(1.08);
  expect(calculateWheelZoomFactor(1000, true)).toBe(0.92);
});

it("uses a stronger but still capped curve for ordinary wheel input", () => {
  expect(calculateWheelZoomFactor(-1, false)).toBeGreaterThan(
    calculateWheelZoomFactor(-1, true),
  );
  expect(calculateWheelZoomFactor(-1000, false)).toBe(1.16);
  expect(calculateWheelZoomFactor(1000, false)).toBe(0.84);
});

it("zooms around viewport center while preserving existing pan", () => {
  expect(calculateCenteredZoom(1, { x: 80, y: -40 }, 1.5)).toEqual({
    scale: 1.5,
    pan: { x: 120, y: -60 },
  });
});
```

- [ ] **Step 2: Run the focused tests and verify the new API is missing**

Run: `pnpm --filter @archlex/playground test -- src/components/preview-transform.test.ts`

Expected: FAIL because `calculateWheelZoomFactor` and `calculateCenteredZoom` are not exported.

- [ ] **Step 3: Implement the minimal damped factor and centered helper**

```ts
export function calculateWheelZoomFactor(
  deltaY: number,
  isPinchGesture: boolean,
): number {
  const sensitivity = isPinchGesture ? 0.0025 : 0.01;
  const cap = isPinchGesture ? 0.08 : 0.16;
  const signedChange = Math.max(
    -cap,
    Math.min(cap, -deltaY * sensitivity),
  );
  return 1 + signedChange;
}

export function calculateCenteredZoom(
  scale: number,
  pan: Point,
  nextScale: number,
): { scale: number; pan: Point } {
  return calculateAnchoredZoom(scale, pan, { x: 0, y: 0 }, nextScale);
}
```

Remove `calculateWheelZoomDelta`; callers will migrate in Task 2.

- [ ] **Step 4: Run the transform tests**

Run: `pnpm --filter @archlex/playground test -- src/components/preview-transform.test.ts`

Expected: PASS, including the existing clamping, fit, and anchored-transform cases.

- [ ] **Step 5: Commit the transform behavior**

```bash
git add apps/playground/src/components/preview-transform.ts apps/playground/src/components/preview-transform.test.ts
git commit -m "fix: damp and center preview zoom"
```

---

### Task 2: Route Preview Gestures and Buttons Through Centered Zoom

**Files:**
- Modify: `apps/playground/src/components/Preview.tsx`
- Test: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: `calculateWheelZoomFactor(deltaY, isPinchGesture)` and `calculateCenteredZoom(scale, pan, nextScale)` from Task 1.
- Produces: preview wheel and zoom-button behavior centered on the viewport while preserving pan.

- [ ] **Step 1: Add a failing browser test for centered, magnitude-sensitive wheel zoom**

```js
test("zooms gradually around the preview center", async ({ page }) => {
  await page.goto("/");
  const viewport = page.locator(".preview-viewport");
  const stage = page.locator(".preview-stage");

  await page.getByRole("button", { name: "Actual size" }).click();

  await viewport.dispatchEvent("wheel", {
    deltaY: -4,
    ctrlKey: true,
    clientX: 50,
    clientY: 50,
  });

  await expect(stage).toHaveAttribute("data-pan-x", "0");
  await expect(stage).toHaveAttribute("data-pan-y", "0");
  await expect(stage).toHaveAttribute("data-scale", "1.0100");
});
```

- [ ] **Step 2: Run the focused browser test and verify current pointer anchoring fails it**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "zooms gradually around"`

Expected: FAIL because the current handler adjusts pan around the event coordinates and uses a fixed delta.

- [ ] **Step 3: Introduce one centered zoom callback and use it for wheel and buttons**

```ts
const zoomTo = useCallback(
  (getNextScale: (currentScale: number) => number) => {
    setScale((currentScale) => {
      const next = calculateCenteredZoom(
        currentScale,
        panRef.current,
        getNextScale(currentScale),
      );
      updatePan(next.pan);
      return next.scale;
    });
  },
  [updatePan],
);

const zoomBy = useCallback(
  (factor: number) => zoomTo((currentScale) => currentScale * factor),
  [zoomTo],
);
```

In `handleWheel`, remove pointer-bound calculations and call:

```ts
const factor = calculateWheelZoomFactor(event.deltaY, event.ctrlKey);
zoomBy(factor);
```

Use `zoomBy(1 / 1.1)` for Zoom out and `zoomBy(1.1)` for Zoom in. Add `data-scale={scale.toFixed(4)}` to `.preview-stage` so the browser test can assert exact relative changes without parsing CSS transforms.

- [ ] **Step 4: Run zoom tests and playground typechecking**

Run: `pnpm --filter @archlex/playground test -- src/components/preview-transform.test.ts && pnpm --filter @archlex/playground typecheck && pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "zooms gradually around"`

Expected: all commands PASS.

- [ ] **Step 5: Commit preview wiring**

```bash
git add apps/playground/src/components/Preview.tsx tests/browser/playground-workspace.spec.mjs
git commit -m "fix: center playground zoom interactions"
```

---

### Task 3: Accessible Diagram Settings Popover

**Files:**
- Create: `apps/playground/src/components/DiagramSettings.tsx`
- Create: `apps/playground/src/components/DiagramSettings.test.tsx`
- Modify: `apps/playground/src/components/CommandBar.tsx`
- Modify: `apps/playground/src/components/Icon.tsx`
- Test: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: `direction`, `validation`, `onDirectionChange`, and `onValidationChange` currently passed to `CommandBar`.
- Produces: `DiagramSettingsProps` with those four fields and an accessible button named `Diagram settings`.

- [ ] **Step 1: Add failing source-contract and browser behavior tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DiagramSettings", () => {
  const source = readFileSync(
    new URL("./DiagramSettings.tsx", import.meta.url),
    "utf8",
  );

  it("exposes popover state and labelled native controls", () => {
    expect(source).toContain('aria-expanded={isOpen}');
    expect(source).toContain('aria-controls="diagram-settings-popover"');
    expect(source).toContain('htmlFor="direction-select"');
    expect(source).toContain('htmlFor="validation-select"');
    expect(source).toContain('event.key === "Escape"');
  });
});
```

Replace the existing browser test's visible layout/validation assertions with:

```js
await expect(page.getByLabel("Layout direction")).toHaveCount(0);
await expect(page.getByLabel("Validation mode")).toHaveCount(0);
const settings = page.getByRole("button", { name: "Diagram settings" });
await expect(settings).toHaveAttribute("aria-expanded", "false");
await settings.click();
await expect(page.getByLabel("Layout direction")).toBeVisible();
await expect(page.getByLabel("Validation mode")).toBeVisible();
await page.getByLabel("Layout direction").selectOption("TB");
await expect(settings).toHaveAttribute("aria-expanded", "true");
await page.keyboard.press("Escape");
await expect(settings).toBeFocused();
```

- [ ] **Step 2: Run tests and verify the component and behavior are absent**

Run: `pnpm --filter @archlex/playground test -- src/components/DiagramSettings.test.tsx && pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "groups infrequent actions"`

Expected: FAIL because `DiagramSettings.tsx` does not exist and both fields are currently always visible.

- [ ] **Step 3: Implement the settings component**

Create a controlled component with this public interface:

```ts
interface DiagramSettingsProps {
  direction: "LR" | "RL" | "TB" | "BT";
  validation: ValidationMode;
  onDirectionChange: (value: "LR" | "RL" | "TB" | "BT") => void;
  onValidationChange: (value: ValidationMode) => void;
}
```

Use `useState`, a wrapper ref, and a trigger ref. Attach `pointerdown` and `keydown` listeners only while open. Close when the pointer target is outside the wrapper. On Escape, close and call `triggerRef.current?.focus()`. Render:

```tsx
<div className="diagram-settings" ref={rootRef}>
  <button
    ref={triggerRef}
    type="button"
    className="btn-secondary settings-trigger"
    aria-expanded={isOpen}
    aria-controls="diagram-settings-popover"
    onClick={() => setIsOpen((open) => !open)}
  >
    <Icon name="settings" />
    <span>Settings</span>
  </button>
  {isOpen ? (
    <div id="diagram-settings-popover" className="settings-popover">
      <div className="settings-field">
        <label htmlFor="direction-select">Layout direction</label>
        <p id="direction-description">Choose how the diagram flows.</p>
        <select
          id="direction-select"
          value={direction}
          aria-describedby="direction-description"
          onChange={(event) =>
            onDirectionChange(
              event.target.value as "LR" | "RL" | "TB" | "BT",
            )
          }
        >
          <option value="LR">Left to right</option>
          <option value="RL">Right to left</option>
          <option value="TB">Top to bottom</option>
          <option value="BT">Bottom to top</option>
        </select>
      </div>
      <div className="settings-field">
        <label htmlFor="validation-select">Validation mode</label>
        <p id="validation-description">Choose how strictly source is checked.</p>
        <select
          id="validation-select"
          value={validation}
          aria-describedby="validation-description"
          onChange={(event) =>
            onValidationChange(event.target.value as ValidationMode)
          }
        >
          <option value="normal">Normal</option>
          <option value="strict">Strict</option>
          <option value="off">Off</option>
        </select>
      </div>
    </div>
  ) : null}
</div>
```

Add `"settings"` to `IconName` and use a sliders-style path. Move the two existing select blocks from `CommandBar` into this component. Leave the example selector in `.command-bar-context`; render `DiagramSettings` in `.command-bar-actions` before the theme icon, Import, Export, and fullscreen.

- [ ] **Step 4: Run component, browser, and type tests**

Run: `pnpm --filter @archlex/playground test -- src/components/DiagramSettings.test.tsx && pnpm --filter @archlex/playground typecheck && pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "groups infrequent actions|retains the current SVG"`

Expected: PASS. The rendering test opens Settings before selecting Layout direction.

- [ ] **Step 5: Commit the settings interaction**

```bash
git add apps/playground/src/components/DiagramSettings.tsx apps/playground/src/components/DiagramSettings.test.tsx apps/playground/src/components/CommandBar.tsx apps/playground/src/components/Icon.tsx tests/browser/playground-workspace.spec.mjs
git commit -m "feat: simplify playground command bar"
```

---

### Task 4: Refined Styling, Responsive Layout, and Visual Verification

**Files:**
- Modify: `apps/playground/src/styles.css`
- Modify: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: `.command-bar-context`, `.diagram-settings`, `.settings-trigger`, and `.settings-popover` from Task 3.
- Produces: a 44–48px single-row command bar and token-based popover in light, dark, desktop, and narrow layouts.

- [ ] **Step 1: Add failing command-bar geometry and popover placement assertions**

```js
test("keeps compact controls on one row at narrow desktop widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 700 });
  await page.goto("/");
  const bar = page.getByRole("banner");
  const box = await bar.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeLessThanOrEqual(48);

  await page.getByRole("button", { name: "Diagram settings" }).click();
  const popover = page.locator("#diagram-settings-popover");
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("position", "absolute");
});
```

- [ ] **Step 2: Run the geometry test and verify styling is incomplete**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "narrow desktop widths"`

Expected: FAIL because the new classes do not yet have their final responsive and popover styles.

- [ ] **Step 3: Implement the restrained command-bar and popover CSS**

Use shared tokens throughout. Apply these structural rules, refining values only when browser inspection proves necessary:

```css
.command-bar {
  position: relative;
  gap: 0.75rem;
  min-height: 2.875rem;
  padding: 0.3125rem 0.75rem;
}

.command-bar-context {
  flex: 1 1 auto;
  min-width: 8rem;
  max-width: 28rem;
}

.command-bar-context select {
  width: 100%;
}

.diagram-settings {
  position: relative;
}

.settings-popover {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.5rem);
  right: 0;
  width: min(20rem, calc(100vw - 1.5rem));
  padding: 0.75rem;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: var(--surface-1);
  box-shadow: var(--shadow-raised);
}
```

Use a two-row internal grid inside the popover, not in the command bar. At `max-width: 900px`, visually hide the example prefix and Settings text while retaining accessible names. Do not hide Import or Export and do not allow `.command-bar` to wrap. Add a `prefers-reduced-motion: reduce` rule that removes command-bar and popover animation.

- [ ] **Step 4: Run full verification and visually inspect supported states**

Run:

```bash
pnpm --filter @archlex/playground test
pnpm --filter @archlex/playground typecheck
pnpm --filter @archlex/playground build
pnpm exec playwright test tests/browser/playground-workspace.spec.mjs
pnpm exec biome check apps/playground/src/components apps/playground/src/styles.css tests/browser/playground-workspace.spec.mjs
```

Expected: all commands PASS.

Start the playground with `pnpm --filter @archlex/playground dev --host 127.0.0.1`, then inspect 1440×900 and 820×700 in both themes. Confirm the header stays one row, the example remains readable, primary file actions remain visible, the popover stays within the viewport, focus states are clear, and centered zoom feels gradual with a trackpad. Also inspect fullscreen preview to confirm its controls and centered zoom still work.

- [ ] **Step 5: Commit styling and browser coverage**

```bash
git add apps/playground/src/styles.css tests/browser/playground-workspace.spec.mjs
git commit -m "style: refine playground control hierarchy"
```

---

### Task 5: Final Regression Check

**Files:**
- Verify only; modify a file only if a regression is found, then rerun the affected task's test-first cycle.

**Interfaces:**
- Consumes: all behavior from Tasks 1–4.
- Produces: evidence that the focused feature and monorepo remain healthy.

- [ ] **Step 1: Run the final verification suite from a clean working tree**

```bash
git status --short
pnpm --filter @archlex/playground test
pnpm --filter @archlex/playground typecheck
pnpm --filter @archlex/playground build
pnpm exec playwright test tests/browser/playground-workspace.spec.mjs
pnpm typecheck
git diff --check
```

Expected: the initial status is clean, all test/build/typecheck commands PASS, and `git diff --check` prints nothing.

- [ ] **Step 2: Review the delivered diff against the approved design**

Run: `git log --oneline --decorate -6 && git diff 49d90ef..HEAD -- apps/playground tests/browser/playground-workspace.spec.mjs`

Expected: the diff contains only the compact command bar, settings popover, centered damped zoom, tests, and associated styles described in the design.
