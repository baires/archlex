# CloudMer Playground Focused Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crowded playground shell with a compact operations-console workspace featuring a resizable editor-first split, status-driven diagnostics, and distraction-free fullscreen rendering.

**Architecture:** Keep `App` as the owner of rendering and persisted product preferences, introduce a `Workspace` boundary for transient layout state, and split the current toolbar and diagnostics panel into focused components. Preserve the current abortable render pipeline and keep the preview mounted while changing layout modes so its pan, zoom, and selection state survive fullscreen transitions.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, CSS, Vitest 3, Playwright 1.62, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`.

## Global Constraints

- Desktop defaults to exactly 40% editor and 60% preview.
- The desktop split ratio is persisted; fullscreen and diagnostics drawer state are not persisted.
- Errors auto-open diagnostics; warnings and information only update counts.
- The previous successful SVG remains visible while rendering and after internal render failures.
- Fullscreen must fall back to an in-app takeover when the Fullscreen API is unavailable or rejects.
- Bundle IBM Plex Sans and IBM Plex Mono; make no runtime font request.
- Do not use gradients, glass blur, glow, decorative shadows, emoji controls, oversized cards, or decorative entrance animations.
- Official provider icons retain their official colors.
- All controls, the separator, diagnostics, tabs, and fullscreen are keyboard operable.
- Motion respects `prefers-reduced-motion`.
- Do not change the public `@cloudmer/core` API.

---

## File Structure

### Create

- `apps/playground/src/components/Icon.tsx` — small local SVG icon set with decorative paths hidden from assistive technology.
- `apps/playground/src/components/CommandBar.tsx` — examples, direction, validation, theme, export menu, and fullscreen entry.
- `apps/playground/src/components/ExportMenu.tsx` — copy/download action disclosure and keyboard dismissal.
- `apps/playground/src/components/Workspace.tsx` — desktop split, keyboard separator, narrow tabs, drawer placement, and fullscreen shell.
- `apps/playground/src/components/StatusBar.tsx` — provider, position, diagnostics counts, transient operation messages, render state, and timing.
- `apps/playground/src/components/DiagnosticsDrawer.tsx` — severity filters, compact rows, remediation expansion, and diagnostic navigation.
- `apps/playground/src/components/workspace-state.ts` — pure split-ratio, diagnostic-summary, and auto-open policy helpers.
- `apps/playground/src/components/workspace-state.test.ts` — unit coverage for workspace policies.
- `tests/browser/playground-workspace.spec.mjs` — behavior and accessibility coverage for the redesigned shell.

### Modify

- `apps/playground/src/App.tsx` — render timing, provider metadata, operation messages, new component composition, and persisted split ratio.
- `apps/playground/src/components/Editor.tsx` — compact pane header, document label, cursor reporting, and focus targeting.
- `apps/playground/src/components/Preview.tsx` — controlled fullscreen presentation and quiet view controls without remounting the canvas.
- `apps/playground/src/styles.css` — replace the existing visual system and layout styles.
- `apps/playground/src/examples.ts` — no data changes; import its existing `ArchitectureExample` type from the new command bar.
- `apps/playground/src/main.tsx` — import bundled IBM Plex font weights.
- `apps/playground/package.json` and `pnpm-lock.yaml` — add the two font packages.
- `tests/browser/phase-one.spec.mjs` — update shell selectors and preserve existing renderer assertions.
- `tests/browser/visual-acceptance.spec.mjs` — add focused-workspace screenshot states.

### Remove

- `apps/playground/src/components/Toolbar.tsx` — replaced by `CommandBar` and `ExportMenu`.
- `apps/playground/src/components/Diagnostics.tsx` — replaced by `StatusBar` and `DiagnosticsDrawer`.

---

### Task 1: Workspace State Policies

**Files:**
- Create: `apps/playground/src/components/workspace-state.ts`
- Create: `apps/playground/src/components/workspace-state.test.ts`

**Interfaces:**
- Consumes: `Diagnostic` from `@cloudmer/model`.
- Produces: `clampSplitRatio(value: number): number`, `summarizeDiagnostics(diagnostics: readonly Diagnostic[]): DiagnosticSummary`, `shouldAutoOpenDiagnostics(previous: DiagnosticSummary, next: DiagnosticSummary): boolean`, and `DEFAULT_SPLIT_RATIO`.

- [ ] **Step 1: Write failing unit tests for the state rules**

```ts
import type { Diagnostic } from "@cloudmer/model";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPLIT_RATIO,
  clampSplitRatio,
  shouldAutoOpenDiagnostics,
  summarizeDiagnostics,
} from "./workspace-state.js";

const diagnostic = (severity: Diagnostic["severity"]): Diagnostic => ({
  severity,
  code: `CM-${severity}`,
  message: severity,
  span: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 2, offset: 1 },
  },
  elements: [],
});

describe("workspace state", () => {
  it("defaults to a 40/60 split and clamps persisted values", () => {
    expect(DEFAULT_SPLIT_RATIO).toBe(0.4);
    expect(clampSplitRatio(Number.NaN)).toBe(0.4);
    expect(clampSplitRatio(0.1)).toBe(0.25);
    expect(clampSplitRatio(0.8)).toBe(0.7);
    expect(clampSplitRatio(0.55)).toBe(0.55);
  });

  it("summarizes each severity independently", () => {
    expect(
      summarizeDiagnostics([
        diagnostic("error"),
        diagnostic("warning"),
        diagnostic("info"),
        diagnostic("warning"),
      ]),
    ).toEqual({ error: 1, warning: 2, info: 1, total: 4 });
  });

  it("opens only when a completed result introduces errors", () => {
    const clear = { error: 0, warning: 0, info: 0, total: 0 };
    const warning = { error: 0, warning: 1, info: 0, total: 1 };
    const error = { error: 1, warning: 0, info: 0, total: 1 };
    expect(shouldAutoOpenDiagnostics(clear, warning)).toBe(false);
    expect(shouldAutoOpenDiagnostics(clear, error)).toBe(true);
    expect(shouldAutoOpenDiagnostics(error, error)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run apps/playground/src/components/workspace-state.test.ts`

Expected: FAIL because `workspace-state.ts` does not exist.

- [ ] **Step 3: Implement the pure state helpers**

```ts
import type { Diagnostic } from "@cloudmer/model";

export const DEFAULT_SPLIT_RATIO = 0.4;
export const MIN_SPLIT_RATIO = 0.25;
export const MAX_SPLIT_RATIO = 0.7;

export interface DiagnosticSummary {
  error: number;
  warning: number;
  info: number;
  total: number;
}

export function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_RATIO;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value));
}

export function summarizeDiagnostics(
  diagnostics: readonly Diagnostic[],
): DiagnosticSummary {
  const summary = { error: 0, warning: 0, info: 0, total: diagnostics.length };
  for (const item of diagnostics) summary[item.severity] += 1;
  return summary;
}

export function shouldAutoOpenDiagnostics(
  previous: DiagnosticSummary,
  next: DiagnosticSummary,
): boolean {
  return previous.error === 0 && next.error > 0;
}
```

- [ ] **Step 4: Run the focused tests**

Run: `pnpm vitest run apps/playground/src/components/workspace-state.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/src/components/workspace-state.ts apps/playground/src/components/workspace-state.test.ts
git commit -m "test: define playground workspace policies"
```

---

### Task 2: Operations-Console Foundation and Icon Set

**Files:**
- Create: `apps/playground/src/components/Icon.tsx`
- Modify: `apps/playground/src/main.tsx`
- Modify: `apps/playground/src/styles.css`
- Modify: `apps/playground/package.json`
- Modify: `pnpm-lock.yaml`
- Test: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: no application state.
- Produces: `Icon({ name, size? }: { name: IconName; size?: number })` and the base CSS tokens used by all later tasks.

- [ ] **Step 1: Add a browser test for fonts and forbidden visual treatments**

Create `tests/browser/playground-workspace.spec.mjs`:

```js
import { expect, test } from "@playwright/test";

test("uses the operations-console visual foundation", async ({ page }) => {
  await page.goto("/");
  const body = page.locator("body");
  await expect(body).toHaveCSS("font-family", /IBM Plex Sans/);
  const styles = await page.locator("style, link[rel=stylesheet]").evaluateAll(
    async (nodes) => (await Promise.all(nodes.map(async (node) => {
      if (node.tagName === "STYLE") return node.textContent ?? "";
      const response = await fetch(node.href);
      return response.text();
    }))).join("\n"),
  );
  expect(styles).not.toMatch(/backdrop-filter|linear-gradient|radial-gradient/);
  await expect(page.locator(".toolbar")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the browser test and verify it fails**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "visual foundation"`

Expected: FAIL because IBM Plex is not bundled and the legacy toolbar/gradients still exist.

- [ ] **Step 3: Add bundled fonts**

Run: `pnpm --filter @cloudmer/playground add @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono`

Add to `apps/playground/src/main.tsx` before the stylesheet import:

```ts
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
```

- [ ] **Step 4: Implement the local SVG icon component**

Define this union in `Icon.tsx`:

```ts
export type IconName =
  | "chevron-down"
  | "clipboard"
  | "download"
  | "enter-fullscreen"
  | "exit-fullscreen"
  | "fit"
  | "moon"
  | "sun"
  | "warning"
  | "error"
  | "info"
  | "zoom-in"
  | "zoom-out";
```

Render a `16 × 16` SVG with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.75}`, `aria-hidden="true"`, and a `switch` mapping each name to explicit `<path>`, `<circle>`, or `<line>` children. Do not render text or emoji from `Icon`.

- [ ] **Step 5: Replace the CSS token layer and global geometry**

Replace the current font import, gradients, glass effects, shadows, and entrance animations in `styles.css`. Start with these exact tokens:

```css
:root {
  --font-ui: "IBM Plex Sans", sans-serif;
  --font-code: "IBM Plex Mono", monospace;
  --surface-0: #f2f3f1;
  --surface-1: #ffffff;
  --surface-2: #e8ebe8;
  --line: #c8ceca;
  --line-strong: #909a94;
  --text-1: #18201c;
  --text-2: #59635d;
  --accent: #087f70;
  --accent-contrast: #ffffff;
  --error: #b4232f;
  --warning: #9a6400;
  --info: #246a9b;
}

[data-theme="dark"] {
  --surface-0: #090d0f;
  --surface-1: #0f1417;
  --surface-2: #171d20;
  --line: #2d373b;
  --line-strong: #526067;
  --text-1: #d9dfdc;
  --text-2: #8d9994;
  --accent: #63d7c6;
  --accent-contrast: #07110f;
  --error: #ff6b78;
  --warning: #e9b949;
  --info: #72b7e5;
}
```

Retain required renderer canvas colors through separate `--diagram-canvas` tokens. Add a global `:focus-visible` outline and a reduced-motion media query that sets transition durations to zero.

- [ ] **Step 6: Run the focused browser test and typecheck**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "visual foundation" && pnpm typecheck`

Expected: browser test PASS and 15 typecheck tasks PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/playground/package.json pnpm-lock.yaml apps/playground/src/main.tsx apps/playground/src/styles.css apps/playground/src/components/Icon.tsx tests/browser/playground-workspace.spec.mjs
git commit -m "style: establish playground operations console"
```

---

### Task 3: Command Bar, Export Menu, and Render Metadata

**Files:**
- Create: `apps/playground/src/components/CommandBar.tsx`
- Create: `apps/playground/src/components/ExportMenu.tsx`
- Modify: `apps/playground/src/App.tsx:48-197`
- Remove: `apps/playground/src/components/Toolbar.tsx`
- Modify: `apps/playground/src/styles.css`
- Test: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: existing `ArchitectureExample`, `ValidationMode`, theme, direction, SVG availability, and callbacks from `App`.
- Produces: `CommandBarProps`, one `Export` disclosure, and `OperationMessage = { tone: "success" | "error"; text: string } | null` for the status bar.

- [ ] **Step 1: Add failing browser coverage for command hierarchy and export**

```js
test("groups infrequent actions without hiding core configuration", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toHaveClass(/command-bar/);
  await expect(page.getByLabel("Example")).toBeVisible();
  await expect(page.getByLabel("Layout direction")).toBeVisible();
  await expect(page.getByLabel("Validation mode")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy SVG" })).toHaveCount(0);

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("menuitem", { name: "Copy SVG" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Download SVG" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Copy SVG" })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "groups infrequent"`

Expected: FAIL because the old toolbar exposes separate icon/Download buttons.

- [ ] **Step 3: Build `ExportMenu`**

Use this interface:

```ts
interface ExportMenuProps {
  disabled: boolean;
  onCopySvg: () => Promise<void>;
  onDownloadSvg: () => void;
}
```

The trigger is a button with `aria-haspopup="menu"` and `aria-expanded`. The menu uses `role="menu"`; actions use `role="menuitem"`. Close on action, outside pointer-down, and Escape; return focus to the trigger on Escape.

- [ ] **Step 4: Build `CommandBar` and remove `Toolbar`**

Use this interface:

```ts
interface CommandBarProps {
  direction: "LR" | "RL" | "TB" | "BT";
  validation: ValidationMode;
  theme: "dark" | "light";
  examples: readonly ArchitectureExample[];
  canExport: boolean;
  onDirectionChange: (value: "LR" | "RL" | "TB" | "BT") => void;
  onValidationChange: (value: ValidationMode) => void;
  onThemeChange: (value: "dark" | "light") => void;
  onSelectExample: (example: ArchitectureExample) => void;
  onCopySvg: () => Promise<void>;
  onDownloadSvg: () => void;
  onEnterFullscreen: () => void;
}
```

Render the wordmark as `CLOUDMER` with a visually hidden `h1` containing `CloudMer`. Give every icon-only button an accessible name and `title`.

- [ ] **Step 5: Make copy/download outcomes explicit and measure rendering**

In `App.tsx`, replace `status` and `copied` with:

```ts
type OperationMessage = { tone: "success" | "error"; text: string } | null;
const [operationMessage, setOperationMessage] = useState<OperationMessage>(null);
const [renderDurationMs, setRenderDurationMs] = useState<number | null>(null);
const renderStartedAtRef = useRef(0);
```

Set `renderStartedAtRef.current = performance.now()` immediately before `cloudmer.render`. On resolution, store `Math.round(performance.now() - renderStartedAtRef.current)`. Make copy `async`, catch clipboard rejection, and set either `SVG copied` or `Copy failed`. Wrap download creation in `try/catch` and report `Download failed` on failure. Clear operation messages after 2 seconds with an effect cleanup.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "groups infrequent" && pnpm typecheck`

Expected: focused test PASS and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/playground/src/App.tsx apps/playground/src/components/CommandBar.tsx apps/playground/src/components/ExportMenu.tsx apps/playground/src/components/Toolbar.tsx apps/playground/src/styles.css tests/browser/playground-workspace.spec.mjs
git commit -m "feat: introduce compact playground command bar"
```

---

### Task 4: Resizable Workspace and Narrow Tabs

**Files:**
- Create: `apps/playground/src/components/Workspace.tsx`
- Modify: `apps/playground/src/App.tsx`
- Modify: `apps/playground/src/components/Editor.tsx`
- Modify: `apps/playground/src/styles.css`
- Test: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: `splitRatio`, `onSplitRatioChange`, editor/preview/drawer React nodes, and fullscreen state.
- Produces: pointer/keyboard resizing and `WorkspaceTab = "editor" | "preview"`.

- [ ] **Step 1: Add failing desktop split and keyboard tests**

```js
test("supports a persisted keyboard-resizable 40/60 workspace", async ({ page }) => {
  await page.goto("/");
  const workspace = page.getByTestId("workspace");
  const separator = page.getByRole("separator", { name: "Resize editor and preview" });
  await expect(separator).toHaveAttribute("aria-valuenow", "40");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "42");
  await page.reload();
  await expect(page.getByRole("separator", { name: "Resize editor and preview" })).toHaveAttribute("aria-valuenow", "42");
  await expect(workspace).toBeVisible();
});
```

- [ ] **Step 2: Add failing narrow-tab coverage**

```js
test("uses editor and preview tabs on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Editor" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("tabpanel", { name: "Preview" })).toBeVisible();
  await expect(page.getByRole("separator")).toHaveCount(0);
});
```

- [ ] **Step 3: Run both tests and verify they fail**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "resizable|narrow screens"`

Expected: FAIL because no separator or tabs exist.

- [ ] **Step 4: Implement `Workspace`**

Use this interface:

```ts
export type WorkspaceTab = "editor" | "preview";

interface WorkspaceProps {
  splitRatio: number;
  onSplitRatioChange: (value: number) => void;
  editor: ReactNode;
  preview: ReactNode;
  diagnosticsDrawer: ReactNode;
  statusBar: ReactNode;
  isFullscreen: boolean;
}
```

The desktop grid uses `gridTemplateColumns: ${splitRatio * 100}% 1px 1fr`. Pointer movement calculates `(clientX - workspace.left) / workspace.width` and passes it through `clampSplitRatio`. ArrowLeft/ArrowRight change the ratio by `0.02`; Home sets `0.25`; End sets `0.7`. Expose `role="separator"`, `aria-orientation="vertical"`, and percentage-valued `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.

Render a `role="tablist"` at `max-width: 760px`; use paired `role="tab"` and `role="tabpanel"` elements with `aria-controls`/`aria-labelledby`. Left/Right arrow keys switch tabs.

- [ ] **Step 5: Persist the split ratio in `App`**

Extend `PersistedOptions` with `splitRatio: number`. Parse using `clampSplitRatio(parsed.splitRatio)`, default to `DEFAULT_SPLIT_RATIO`, and include the ratio in the existing options effect dependency list and JSON value.

- [ ] **Step 6: Report editor cursor position**

Extend `EditorProps` with `documentLabel: string` and `onCursorChange(position: { line: number; column: number }): void`. On `onSelect`, derive line/column from `selectionStart`:

```ts
const beforeCursor = event.currentTarget.value.slice(0, event.currentTarget.selectionStart);
const lines = beforeCursor.split("\n");
onCursorChange({ line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 });
```

Replace the `Code` title and error pill with the document label and a subdued `SOURCE` system label.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "resizable|narrow screens" && pnpm typecheck`

Expected: both tests PASS and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/playground/src/App.tsx apps/playground/src/components/Workspace.tsx apps/playground/src/components/Editor.tsx apps/playground/src/styles.css tests/browser/playground-workspace.spec.mjs
git commit -m "feat: add resizable responsive playground workspace"
```

---

### Task 5: Status Bar and On-Demand Diagnostics

**Files:**
- Create: `apps/playground/src/components/StatusBar.tsx`
- Create: `apps/playground/src/components/DiagnosticsDrawer.tsx`
- Modify: `apps/playground/src/App.tsx`
- Modify: `apps/playground/src/components/Workspace.tsx`
- Remove: `apps/playground/src/components/Diagnostics.tsx`
- Modify: `apps/playground/src/styles.css`
- Test: `tests/browser/playground-workspace.spec.mjs`
- Modify: `tests/browser/phase-one.spec.mjs:158-160`

**Interfaces:**
- Consumes: diagnostics, summary, selection, provider, cursor, render state/timing, operation message, and open/filter callbacks.
- Produces: `DiagnosticFilter = "all" | Diagnostic["severity"]` and accessible drawer/status interactions.

- [ ] **Step 1: Add failing warning/error policy tests**

```js
const WARNING_SOURCE = `provider gcp\ncontrol: gke\nconfig: config-connector\ncontrol -[manages]-> config`;
const ERROR_SOURCE = `provider gcp\nregion broken {\n  node: gke`;

test("keeps warnings quiet and opens diagnostics for errors", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox");
  await editor.fill(WARNING_SOURCE);
  await expect(page.getByRole("button", { name: /1 warning/ })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toHaveCount(0);

  await editor.fill(ERROR_SOURCE);
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).not.toBeFocused();
});
```

- [ ] **Step 2: Add failing diagnostic row and keyboard tests**

```js
test("filters and navigates compact diagnostic rows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill(WARNING_SOURCE);
  await page.getByRole("button", { name: /1 warning/ }).click();
  const drawer = page.getByRole("dialog", { name: "Diagnostics" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/CM-SEM-UNKNOWN-RELATIONSHIP/)).toBeVisible();
  const row = drawer.getByRole("option").first();
  await row.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("button", { name: /warning/ })).toBeFocused();
});
```

- [ ] **Step 3: Run the diagnostics tests and verify they fail**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "warnings quiet|compact diagnostic"`

Expected: FAIL because the current panel auto-renders and uses card-like list items.

- [ ] **Step 4: Implement `StatusBar`**

Use this interface:

```ts
interface StatusBarProps {
  provider: "aws" | "gcp" | "unknown";
  cursor: { line: number; column: number };
  summary: DiagnosticSummary;
  activeFilter: DiagnosticFilter;
  isRendering: boolean;
  renderDurationMs: number | null;
  operationMessage: OperationMessage;
  onOpenDiagnostics: (filter: DiagnosticFilter) => void;
}
```

Render separate count buttons only for nonzero severities, each named like `1 warning, open diagnostics`. Render `Ln 5, Col 16`, provider, and either `Rendering` or `Ready · 42 ms` using tabular numerals. Put operation feedback in a polite live region; diagnostic count announcement uses a separate polite live region with only the aggregate summary.

- [ ] **Step 5: Implement `DiagnosticsDrawer`**

Use this interface:

```ts
export type DiagnosticFilter = "all" | Diagnostic["severity"];

interface DiagnosticsDrawerProps {
  diagnostics: readonly Diagnostic[];
  filter: DiagnosticFilter;
  selectedId: string | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onFilterChange: (filter: DiagnosticFilter) => void;
  onSelectDiagnostic: (diagnostic: Diagnostic) => void;
  onClose: () => void;
}
```

Render as a nonmodal `role="dialog"` named `Diagnostics`. The rows form a single-select `role="listbox"`; each row is an `option` with a severity marker, message, code, and `Line N`. Enter/Space selects. ArrowUp/ArrowDown moves focus. Escape closes and focuses `triggerRef.current`. A per-row disclosure expands `remediation` without selecting the row.

- [ ] **Step 6: Wire auto-open without focus theft**

In `App`, retain the previous summary in a ref. After a completed render, call `shouldAutoOpenDiagnostics(previous, next)`, open the drawer when true, then update the ref. Do not call `.focus()` on auto-open. Clicking a severity count sets its filter before opening. Closing remains respected until a later completed result transitions from zero errors to one or more errors.

Derive the provider from the first source directive using `/^provider\s+(aws|gcp)\s*$/m`; return `unknown` if absent.

- [ ] **Step 7: Update legacy diagnostic assertions**

In `tests/browser/phase-one.spec.mjs`, replace the assertion that the diagnostic panel does not exist with assertions that no severity buttons exist and the drawer is closed:

```js
await expect(page.getByRole("button", { name: /open diagnostics/ })).toHaveCount(0);
await expect(page.getByRole("dialog", { name: "Diagnostics" })).toHaveCount(0);
```

- [ ] **Step 8: Run diagnostic tests, legacy browser tests, and typecheck**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs tests/browser/phase-one.spec.mjs && pnpm typecheck`

Expected: all selected browser tests PASS and typecheck PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/playground/src/App.tsx apps/playground/src/components/Workspace.tsx apps/playground/src/components/StatusBar.tsx apps/playground/src/components/DiagnosticsDrawer.tsx apps/playground/src/components/Diagnostics.tsx apps/playground/src/styles.css tests/browser/playground-workspace.spec.mjs tests/browser/phase-one.spec.mjs
git commit -m "feat: move diagnostics into playground status drawer"
```

---

### Task 6: Fullscreen Preview with State Restoration

**Files:**
- Modify: `apps/playground/src/App.tsx`
- Modify: `apps/playground/src/components/CommandBar.tsx`
- Modify: `apps/playground/src/components/Workspace.tsx`
- Modify: `apps/playground/src/components/Preview.tsx`
- Modify: `apps/playground/src/styles.css`
- Test: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Consumes: existing mounted preview, `isFullscreen`, `onEnterFullscreen`, and `onExitFullscreen`.
- Produces: `FullscreenMode = "off" | "native" | "in-app"` and stable preview transform across mode changes.

- [ ] **Step 1: Add a failing state-restoration test**

```js
test("fullscreen preview preserves workspace and canvas state", async ({ page }) => {
  await page.goto("/");
  const separator = page.getByRole("separator", { name: "Resize editor and preview" });
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Actual size" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();

  await page.getByRole("button", { name: "Enter fullscreen preview" }).click();
  await expect(page.getByTestId("workspace")).toHaveClass(/is-fullscreen/);
  await expect(page.getByRole("button", { name: "Exit fullscreen preview" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByLabel("Zoom level")).toHaveText("110%");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("workspace")).not.toHaveClass(/is-fullscreen/);
  await expect(separator).toHaveAttribute("aria-valuenow", "42");
  await expect(page.getByLabel("Zoom level")).toHaveText("110%");
});
```

- [ ] **Step 2: Add a failing Fullscreen API rejection test**

```js
test("falls back to in-app fullscreen when the browser request rejects", async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error("denied"));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Enter fullscreen preview" }).click();
  await expect(page.getByTestId("workspace")).toHaveAttribute("data-fullscreen-mode", "in-app");
  await expect(page.getByRole("button", { name: "Exit fullscreen preview" })).toBeVisible();
});
```

- [ ] **Step 3: Run fullscreen tests and verify they fail**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "fullscreen"`

Expected: FAIL because fullscreen mode does not exist.

- [ ] **Step 4: Implement the fullscreen state machine in `Workspace`**

Use:

```ts
export type FullscreenMode = "off" | "native" | "in-app";
```

Keep one preview React node mounted at all times. On entry, attempt `workspaceRef.current?.requestFullscreen()`. Set `native` after resolution or `in-app` after rejection/unavailability. Listen for `fullscreenchange`; if `document.fullscreenElement` becomes null while mode is `native`, set `off`. On Escape in `in-app`, set `off`. On explicit exit in native mode, await `document.exitFullscreen()` and then set `off`.

Do not change split ratio, drawer openness, selected element, or preview transform on entry/exit.

- [ ] **Step 5: Move fullscreen controls into `Preview` without remounting**

Extend `PreviewProps`:

```ts
isFullscreen: boolean;
onExitFullscreen: () => void;
```

In fullscreen, render the same zoom functions in a `.fullscreen-view-controls` cluster containing zoom out, zoom output, zoom in, fit, and exit. Outside fullscreen retain zoom, fit, and actual-size controls in the pane header. Replace the empty-state emoji with the local `fit` icon and terse copy.

- [ ] **Step 6: Style native and in-app modes identically**

`.workspace.is-fullscreen` must occupy `position: fixed; inset: 0; z-index: 1000; background: var(--surface-0)`. Hide command bar, editor, separator, drawer, status, tabs, and preview pane header. Keep the floating controls at `top: 12px; right: 12px`. Add a visible focus treatment and no decorative shadow.

- [ ] **Step 7: Run fullscreen tests, preview interaction test, and typecheck**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs --grep "fullscreen" tests/browser/phase-one.spec.mjs --grep "zoom, fit" && pnpm typecheck`

Expected: all selected tests PASS and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/playground/src/App.tsx apps/playground/src/components/CommandBar.tsx apps/playground/src/components/Workspace.tsx apps/playground/src/components/Preview.tsx apps/playground/src/styles.css tests/browser/playground-workspace.spec.mjs
git commit -m "feat: add distraction-free preview fullscreen"
```

---

### Task 7: Accessibility, Responsive, and Visual Regression Closure

**Files:**
- Modify: `tests/browser/playground-workspace.spec.mjs`
- Modify: `tests/browser/visual-acceptance.spec.mjs`
- Modify: `tests/browser/visual-acceptance.spec.mjs-snapshots/*`
- Modify: `apps/playground/src/styles.css`
- Modify: any playground component with a failure found by this task.

**Interfaces:**
- Consumes: the completed workspace components.
- Produces: final acceptance evidence across themes, desktop/narrow layouts, drawer states, reduced motion, and fullscreen.

- [ ] **Step 1: Add keyboard and reduced-motion acceptance coverage**

```js
test("supports a keyboard-only primary workflow and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  await page.getByRole("separator").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("separator")).toHaveAttribute("aria-valuenow", "38");
  await page.getByRole("button", { name: "Enter fullscreen preview" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Exit fullscreen preview" })).toBeVisible();
  const duration = await page.locator(".diagnostics-drawer").evaluate((node) =>
    getComputedStyle(node).transitionDuration,
  ).catch(() => "0s");
  expect(duration).toBe("0s");
});
```

- [ ] **Step 2: Add visual snapshot scenarios**

Extend the existing snapshot matrix with stable scenarios named:

```text
workspace-dark-desktop
workspace-light-desktop
workspace-dark-narrow-editor
workspace-dark-narrow-preview
workspace-dark-warning-drawer
workspace-dark-error-drawer
workspace-dark-fullscreen
```

Before each screenshot, clear both CloudMer local-storage keys, set the fixed viewport already used by the suite, load a fixed source, wait for the SVG and `Ready` status, and disable caret blinking. Use the existing Darwin-only snapshot policy.

- [ ] **Step 3: Run the new acceptance test and visual suite**

Run: `pnpm exec playwright test tests/browser/playground-workspace.spec.mjs tests/browser/visual-acceptance.spec.mjs --update-snapshots`

Expected: interaction tests PASS and snapshot files are created or deliberately updated.

- [ ] **Step 4: Inspect every updated snapshot**

Open each generated PNG and verify:

- Command bar remains within 48 px.
- Desktop split is 40/60 at default state.
- Status bar remains within 28 px.
- No clipped labels or horizontal page overflow.
- Warning drawer does not resemble stacked cards.
- Fullscreen contains only canvas and the quiet top-right control cluster.
- Dark and light themes retain readable contrast and official provider icon colors.

If any check fails, adjust `styles.css` or the responsible component, rerun the affected snapshot, and inspect it again.

- [ ] **Step 5: Run the complete repository verification**

Run: `pnpm check && pnpm test:browser`

Expected: build, typecheck, Vitest, Biome, and the complete Playwright suite all exit 0.

- [ ] **Step 6: Review the implementation against the design specification**

Compare the completed application with `docs/superpowers/specs/2026-07-31-playground-focused-workspace-design.md`. Confirm every goal, diagnostics policy, fullscreen behavior, visual exclusion, accessibility requirement, and acceptance criterion has either a passing automated test or explicit visual evidence from Step 4.

- [ ] **Step 7: Commit**

```bash
git add apps/playground/src tests/browser
git commit -m "test: close focused workspace acceptance coverage"
```
