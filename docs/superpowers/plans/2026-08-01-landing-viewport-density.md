# Landing Viewport Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit a sharper, indie-toned hero and complete ArchLex render into the first desktop viewport while tightening whitespace throughout the landing page.

**Architecture:** Keep the existing Astro component structure and shared design tokens. Change copy in the landing page, adjust layout only in the landing stylesheet, and encode the viewport contract in the existing Playwright suite.

**Tech Stack:** Astro, CSS, Playwright, pnpm

## Global Constraints

- Headline must be exactly `Write the architecture. We’ll check it.`
- Primary action must be `Try the playground`; secondary action must be `View source`.
- At 1440×900, the header and complete hero product frame must fit within the viewport.
- The diagram image must use `object-fit: contain` on desktop and mobile.
- Preserve accessibility behavior and zero horizontal overflow at 1440px and 390px.
- Do not change lower-page content or application behavior.

---

### Task 1: Encode the First-Viewport Contract

**Files:**
- Modify: `tests/browser/landing.spec.mjs`

**Interfaces:**
- Consumes: the existing `.product-frame`, hero heading, CTA links, and render image DOM.
- Produces: browser-level acceptance checks for copy, viewport fit, and image containment.

- [ ] **Step 1: Write the failing browser assertions**

Update the first landing test to assert the exact headline, `Try the playground`, and `View source`. Add a focused test:

```js
test("fits the complete product hero inside a desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const frame = page.locator(".hero .product-frame");
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  await expect(frame.locator("img")).toHaveCSS("object-fit", "contain");
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs tests/browser/landing.spec.mjs`

Expected: FAIL because the old headline/actions remain and the current frame exceeds 900px.

- [ ] **Step 3: Commit the failing acceptance test**

```bash
git add tests/browser/landing.spec.mjs
git commit -m "test: define compact landing hero contract"
```

### Task 2: Tighten Hero Copy and Composition

**Files:**
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/styles/global.css`

**Interfaces:**
- Consumes: `Button`, `ProductFrame`, `SITE_ROUTES`, and shared `@archlex/design` tokens.
- Produces: approved hero copy and a two-column hero that fits at 1440×900.

- [ ] **Step 1: Replace hero copy**

Use the exact approved headline and labels:

```astro
<h1>Write the architecture. We’ll check it.</h1>
<p class="hero__lede">
  Turn concise cloud text into a validated, accessible diagram—right in your browser.
</p>
<Button href={SITE_ROUTES.playground}>Try the playground <span aria-hidden="true">→</span></Button>
<Button href={SITE_ROUTES.github} variant="text" external>View source ↗</Button>
```

Replace the proof list with four compact facts: AWS + GCP, semantic checks, deterministic SVG, and no sign-up.

- [ ] **Step 2: Implement the compact desktop hero**

Adjust `.hero` to use `min-height: calc(100svh - 4.5rem)`, compact vertical padding, a slightly wider render column, and a bounded workspace height. Reduce heading scale and all hero vertical margins. Set `.product-frame__render img` to `object-fit: contain` with modest internal padding and retain a dark render background.

- [ ] **Step 3: Preserve the mobile hierarchy**

At `max-width: 680px`, keep the stacked layout, hide the source pane, remove render padding that makes the diagram too small, and retain `object-fit: contain`.

- [ ] **Step 4: Run browser tests and verify GREEN**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs tests/browser/landing.spec.mjs`

Expected: all landing tests PASS.

- [ ] **Step 5: Commit the hero implementation**

```bash
git add apps/landing/src/pages/index.astro apps/landing/src/styles/global.css tests/browser/landing.spec.mjs
git commit -m "feat: tighten landing hero viewport"
```

### Task 3: Tighten Lower-Page Rhythm

**Files:**
- Modify: `apps/landing/src/styles/global.css`
- Test: `tests/browser/landing.spec.mjs`

**Interfaces:**
- Consumes: existing `.section`, `.section-marker`, `.capability-list`, `.product-frame--source-to-system`, `.final-cta`, and footer classes.
- Produces: reduced vertical whitespace without changing content structure.

- [ ] **Step 1: Add a structural spacing assertion**

Add a test that measures the gap between the first two bordered sections and asserts it remains under the intended section padding budget while each section remains visually separated by a border.

- [ ] **Step 2: Run the spacing test and verify RED**

Run the new test with the landing Playwright config and confirm it fails against the oversized current spacing.

- [ ] **Step 3: Reduce global section spacing**

Lower `.section` padding, section-marker bottom margin, content-to-panel gaps, source-to-system frame margin, and final CTA outer spacing. Preserve all existing borders and responsive stacking.

- [ ] **Step 4: Run landing tests and verify GREEN**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs tests/browser/landing.spec.mjs`

Expected: all landing tests PASS at desktop and mobile viewports.

- [ ] **Step 5: Commit page-rhythm changes**

```bash
git add apps/landing/src/styles/global.css tests/browser/landing.spec.mjs
git commit -m "style: tighten landing section rhythm"
```

### Task 4: Visual and Repository Verification

**Files:**
- Verify: `apps/landing/src/pages/index.astro`
- Verify: `apps/landing/src/styles/global.css`
- Verify: `tests/browser/landing.spec.mjs`

**Interfaces:**
- Consumes: completed landing changes.
- Produces: verified desktop/mobile presentation and a clean repository state.

- [ ] **Step 1: Run automated verification**

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs
pnpm build:landing
pnpm typecheck
pnpm exec biome check apps/landing/src tests/browser/landing.spec.mjs
git diff --check
```

Expected: all commands PASS.

- [ ] **Step 2: Inspect the live page**

Run the landing app and inspect at 1440×900 and 390×844. Confirm the full render is visible, text is not clipped, CTA hierarchy is clear, and section spacing is intentional.

- [ ] **Step 3: Correct visual regressions test-first**

If inspection finds a measurable regression, add or refine the corresponding Playwright assertion, verify it fails, then make the smallest CSS change and rerun the suite.

- [ ] **Step 4: Commit final polish if needed**

```bash
git add apps/landing/src apps/landing/tests tests/browser/landing.spec.mjs
git commit -m "style: polish compact landing presentation"
```
