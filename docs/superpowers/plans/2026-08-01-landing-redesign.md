# ArchLex Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a top-tier developer landing page that leads with a real ArchLex render and establishes a reusable visual foundation for the landing, playground, and docs apps.

**Architecture:** Add a CSS-only `@archlex/design` workspace package that exports fonts, semantic tokens, and light/dark themes. Rebuild the Astro landing as small server-rendered sections, using a checked-in real render fixture for product proof, and import the shared package into playground and docs through compatibility-safe aliases.

**Tech Stack:** pnpm workspaces, Astro 5, React 19, Next.js 15/Nextra 3, CSS custom properties, Playwright, TypeScript 5.7.

## Global Constraints

- The primary conversion action is opening the playground; GitHub is secondary and docs support evaluation.
- The selected visual direction is Signal Console with the Diagram First hero composition.
- Use real ArchLex source and real repository render output; do not recreate a competitor UI.
- Do not invent customer logos, usage counts, performance benchmarks, or compatibility claims.
- Acid lime is a scarce signal color reserved for primary actions, valid states, and important annotations.
- Landing is fully migrated; playground and docs receive compatibility wiring only, not redesigns.
- The page must work without client-side JavaScript and honor `prefers-reduced-motion`.
- GitHub links render only when `PUBLIC_GITHUB_URL` is configured; no placeholder repository URL may ship.
- Node.js remains `>=22.0.0` and pnpm remains `>=9.0.0`.

---

## File Structure

### Shared design package

- `packages/design/package.json` — CSS package manifest and stable subpath exports.
- `packages/design/fonts.css` — shared IBM Plex Mono and Source Serif 4 font imports and font-family roles.
- `packages/design/tokens.css` — application-neutral spacing, radii, border, shadow, focus, and motion roles.
- `packages/design/themes.css` — light/dark semantic color roles plus compatibility aliases for the current playground.
- `packages/design/index.css` — ordered public entry point.
- `packages/design/README.md` — semantic-token contract and adoption guidance.

### Landing app

- `apps/landing/src/config.ts` — route and optional GitHub configuration.
- `apps/landing/src/layouts/BaseLayout.astro` — metadata, global design imports, skip link, and page shell.
- `apps/landing/src/components/SiteHeader.astro` — responsive product navigation.
- `apps/landing/src/components/Button.astro` — primary, secondary, and text action variants.
- `apps/landing/src/components/ProductFrame.astro` — real source/render product demonstration.
- `apps/landing/src/components/SemanticProof.astro` — drawing-tool versus semantic-tool explanation.
- `apps/landing/src/components/Capabilities.astro` — three evidence-led capability sections.
- `apps/landing/src/components/SourceToSystem.astro` — larger source-to-render proof.
- `apps/landing/src/components/QuickStart.astro` — installation and verified API usage.
- `apps/landing/src/components/SiteFooter.astro` — concise docs/resource/community navigation.
- `apps/landing/src/pages/index.astro` — narrative composition only.
- `apps/landing/src/styles/global.css` — landing resets, utilities, section layout, responsive behavior, and motion.
- `apps/landing/public/archlex-multi-region-dark.png` — real repository render fixture copied from the accepted playground snapshot.
- `apps/landing/public/archlex-event-pipeline-dark.png` — secondary real render fixture.
- `apps/landing/package.json` — shared design and Source Serif dependencies.

### Compatibility consumers and verification

- `apps/playground/src/main.tsx` — import shared design entry point before local styles.
- `apps/playground/src/styles.css` — remove duplicated primitives now provided by compatibility aliases.
- `apps/playground/package.json` — depend on `@archlex/design`.
- `apps/docs/pages/_app.tsx` — import shared design entry point.
- `apps/docs/package.json` — depend on `@archlex/design`.
- `tests/browser/landing.spec.mjs` — semantic, responsive, reduced-motion, and configured-link acceptance checks.
- `playwright.landing.config.mjs` — isolated landing preview on port 4322.

---

### Task 1: Shared Design Package

**Files:**
- Create: `packages/design/package.json`
- Create: `packages/design/fonts.css`
- Create: `packages/design/tokens.css`
- Create: `packages/design/themes.css`
- Create: `packages/design/index.css`
- Create: `packages/design/README.md`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: CSS exports `@archlex/design`, `@archlex/design/fonts.css`, `@archlex/design/tokens.css`, and `@archlex/design/themes.css`.
- Produces: semantic variables `--font-display`, `--font-ui`, `--font-code`, `--surface-canvas`, `--surface-raised`, `--surface-sunken`, `--border-subtle`, `--border-strong`, `--text-primary`, `--text-secondary`, `--signal`, `--signal-hover`, `--signal-contrast`, `--status-danger`, `--status-warning`, `--status-info`, `--focus-ring`, `--radius-control`, `--radius-panel`, `--duration-fast`, and `--duration-base`.
- Produces: compatibility aliases for current playground variables `--surface-0`, `--surface-1`, `--surface-2`, `--line`, `--line-strong`, `--text-1`, `--text-2`, `--accent`, `--accent-hover`, `--accent-contrast`, `--error`, `--warning`, and `--info`.

- [ ] **Step 1: Add a failing package-contract test**

Create `packages/design/package.test.mjs`:

```js
import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const manifest = JSON.parse(await readFile(new URL("./package.json", import.meta.url)));
assert.equal(manifest.name, "@archlex/design");
assert.equal(manifest.exports["."], "./index.css");
assert.equal(manifest.exports["./themes.css"], "./themes.css");

const css = await readFile(new URL("./index.css", import.meta.url), "utf8");
assert.match(css, /fonts\.css/);
assert.match(css, /tokens\.css/);
assert.match(css, /themes\.css/);
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node packages/design/package.test.mjs`

Expected: FAIL because `packages/design/package.json` does not exist.

- [ ] **Step 3: Create the CSS package manifest**

Create `packages/design/package.json` with:

```json
{
  "name": "@archlex/design",
  "version": "0.1.0",
  "private": true,
  "sideEffects": ["*.css"],
  "exports": {
    ".": "./index.css",
    "./fonts.css": "./fonts.css",
    "./tokens.css": "./tokens.css",
    "./themes.css": "./themes.css"
  },
  "scripts": {
    "build": "node package.test.mjs",
    "typecheck": "node package.test.mjs",
    "test": "node package.test.mjs"
  },
  "dependencies": {
    "@fontsource/ibm-plex-mono": "^5.3.0",
    "@fontsource/ibm-plex-sans": "^5.3.0",
    "@fontsource/source-serif-4": "^5.2.5"
  }
}
```

- [ ] **Step 4: Implement the ordered CSS entry points**

Create `packages/design/index.css`:

```css
@import "./fonts.css";
@import "./tokens.css";
@import "./themes.css";
```

Create `packages/design/fonts.css` using package CSS imports for IBM Plex Sans weights 400/500/600, IBM Plex Mono weights 400/500/600, and Source Serif 4 weights 500/600. Define only the three font-family roles listed in Interfaces.

Create `packages/design/tokens.css` with the non-color roles listed in Interfaces. Use squared controls (`2px`) and restrained panels (`6px`), `2px` focus outlines, and 120/180ms motion durations.

Create `packages/design/themes.css` with light values on `:root`, Signal Console dark values on `[data-theme="dark"]`, and a `@media (prefers-color-scheme: dark)` fallback for roots without an explicit theme. Add the compatibility aliases listed in Interfaces through `var(...)`, not copied hex values.

- [ ] **Step 5: Document the package contract**

In `packages/design/README.md`, document import order, semantic token names, explicit `[data-theme]` behavior, the system-preference fallback, and the rule that apps own their component/layout CSS.

- [ ] **Step 6: Install and run the package test**

Run: `pnpm install && node packages/design/package.test.mjs`

Expected: PASS with no output.

- [ ] **Step 7: Commit the shared package**

```bash
git add packages/design pnpm-lock.yaml
git commit -m "feat: add shared ArchLex design tokens"
```

---

### Task 2: Landing Foundation, Header, and Diagram-First Hero

**Files:**
- Create: `apps/landing/src/config.ts`
- Create: `apps/landing/src/components/SiteHeader.astro`
- Create: `apps/landing/src/components/ProductFrame.astro`
- Create: `apps/landing/src/styles/global.css`
- Create: `apps/landing/public/archlex-multi-region-dark.png`
- Modify: `apps/landing/src/components/Button.astro`
- Modify: `apps/landing/src/layouts/BaseLayout.astro`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/package.json`
- Delete: `apps/landing/src/layouts/Layout.astro`

**Interfaces:**
- Consumes: `@archlex/design` and all semantic tokens from Task 1.
- Produces: `SITE_ROUTES` with `docs`, `playground`, and optional `github` URLs.
- Produces: `Button` props `{ href: string; variant?: "primary" | "secondary" | "text"; external?: boolean; class?: string }`.
- Produces: `ProductFrame` props `{ variant?: "hero" | "source-to-system" }`.

- [ ] **Step 1: Add the landing browser test harness**

Create `playwright.landing.config.mjs`:

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "landing.spec.mjs",
  use: { baseURL: "http://127.0.0.1:4322" },
  webServer: {
    command: "pnpm --filter @archlex/landing build && pnpm --filter @archlex/landing preview --host 127.0.0.1 --port 4322",
    port: 4322,
    reuseExistingServer: false
  }
});
```

Create the initial `tests/browser/landing.spec.mjs`:

```js
import { expect, test } from "@playwright/test";

test("leads with a real product render and playground action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("cloud");
  await expect(page.getByRole("link", { name: /open playground/i }).first()).toHaveAttribute("href", /playground/);
  await expect(page.getByRole("img", { name: /multi-region AWS architecture rendered by ArchLex/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused browser test and verify it fails**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs`

Expected: FAIL because the new heading, CTA name, and product image are absent.

- [ ] **Step 3: Configure routes without shipping a fake repository link**

Create `apps/landing/src/config.ts`:

```ts
export const SITE_ROUTES = {
  docs: "/docs",
  playground: "/playground",
  github: import.meta.env.PUBLIC_GITHUB_URL?.trim() || null,
} as const;
```

Render GitHub actions and footer links only when `SITE_ROUTES.github` is non-null.

- [ ] **Step 4: Add the design dependency and remove landing-owned font packages**

Update `apps/landing/package.json` dependencies to include `"@archlex/design": "workspace:*"` and remove direct IBM font dependencies. Run `pnpm install`.

- [ ] **Step 5: Copy the accepted real render fixture**

Copy `tests/browser/visual-acceptance.spec.mjs-snapshots/multi-region-dark-desktop-darwin.png` to `apps/landing/public/archlex-multi-region-dark.png`. Preserve the source fixture unchanged and document its origin in `ProductFrame.astro`.

- [ ] **Step 6: Rebuild the base layout and shared action component**

In `BaseLayout.astro`, import `@archlex/design` and `../styles/global.css`, set `<html lang="en" data-theme="dark">`, add a `Skip to content` link, canonical title/description/Open Graph metadata, and a `<main id="main-content">` target supplied by the page.

Refactor `Button.astro` to emit semantic class names (`button`, `button--primary`, `button--secondary`, `button--text`), include `target="_blank" rel="noreferrer"` for external actions, and forward `class` without Tailwind-like strings.

- [ ] **Step 7: Implement the Signal Console header and hero**

Build `SiteHeader.astro` with the wordmark, Docs, conditional GitHub, and Playground links. Build `ProductFrame.astro` with a narrow real-source rail and the real render image. Include this exact verified source excerpt:

```archlex
direction LR
provider aws
validation normal

account global-core {
  region us-east-1 {
    vpc primary-vpc {
      subnet app-subnet-1 {
        app_primary: ecs
        db_primary: rds
      }
    }
  }
}
```

Compose the hero in `index.astro` with a concise cloud/semantic-validation headline, supporting copy, primary playground action, conditional GitHub action, and truthful proof notes.

- [ ] **Step 8: Implement responsive and reduced-motion styling**

In `global.css`, implement the asymmetric desktop grid, dark texture, restrained lime signal usage, visible focus, skip-link behavior, `max-width` container, and mobile stacking. Add `@media (prefers-reduced-motion: reduce)` that removes animation and transition durations.

- [ ] **Step 9: Run the browser test and build**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs && pnpm build:landing`

Expected: browser test PASS and Astro reports a successful static build.

- [ ] **Step 10: Commit the hero foundation**

```bash
git add apps/landing tests/browser/landing.spec.mjs playwright.landing.config.mjs pnpm-lock.yaml
git commit -m "feat: build diagram-first ArchLex landing hero"
```

---

### Task 3: Product Narrative and Developer Workflow

**Files:**
- Create: `apps/landing/src/components/SemanticProof.astro`
- Create: `apps/landing/src/components/Capabilities.astro`
- Create: `apps/landing/src/components/SourceToSystem.astro`
- Create: `apps/landing/src/components/QuickStart.astro`
- Create: `apps/landing/src/components/SiteFooter.astro`
- Create: `apps/landing/public/archlex-event-pipeline-dark.png`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/styles/global.css`
- Modify: `tests/browser/landing.spec.mjs`

**Interfaces:**
- Consumes: `SITE_ROUTES`, `Button`, `ProductFrame`, and shared semantic tokens.
- Produces: a complete server-rendered landing narrative with no required client JavaScript.

- [ ] **Step 1: Extend the browser test with narrative requirements**

Add:

```js
test("explains semantics and provides a verified quick start", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /diagrams should understand/i })).toBeVisible();
  await expect(page.getByText(/actionable diagnostics/i)).toBeVisible();
  await expect(page.getByText("npm install @archlex/core @archlex/aws @archlex/gcp")).toBeVisible();
  await expect(page.getByRole("heading", { name: /architecture already lives in code/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused browser test and verify it fails**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs`

Expected: the new narrative test fails because the sections are absent.

- [ ] **Step 3: Add the real secondary render fixture**

Copy `tests/browser/visual-acceptance.spec.mjs-snapshots/event-pipeline-dark-desktop-darwin.png` to `apps/landing/public/archlex-event-pipeline-dark.png`.

- [ ] **Step 4: Implement semantic and capability proof sections**

`SemanticProof.astro` contrasts arbitrary drawing nodes with provider-aware resources, containment, and directional relationship validation. `Capabilities.astro` renders exactly three proof groups: actionable diagnostics with partial output, deterministic accessible SVG, and AWS/GCP provider awareness. Use text labels in addition to status colors.

- [ ] **Step 5: Implement the larger source-to-system demonstration**

`SourceToSystem.astro` uses `ProductFrame variant="source-to-system"`, the event-pipeline source from `tests/browser/visual-acceptance.spec.mjs`, and `archlex-event-pipeline-dark.png`. Keep source text selectable and the image descriptive.

- [ ] **Step 6: Implement the verified quick start**

`QuickStart.astro` must copy the current installation and API usage from the root `README.md`. Use `createArchLex`, `awsProvider`, and `gcpProvider` imports exactly as the public README documents them. Include links to `/docs/getting-started` and `/docs/specs/public-api`.

- [ ] **Step 7: Implement the closing CTA and footer**

Compose the approved closing line, primary Playground action, supporting Docs action, and conditional GitHub link. `SiteFooter.astro` includes only routes that currently exist in `apps/docs/pages` or the repository configuration.

- [ ] **Step 8: Complete section styling and responsive layouts**

Add staggered section indexes, editorial headings, technical labels, proof dividers, copyable code surfaces, and image cropping rules. Keep product proof dominant and avoid six equal feature cards.

- [ ] **Step 9: Run narrative tests and build**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs && pnpm build:landing`

Expected: all landing browser tests PASS and the static build succeeds.

- [ ] **Step 10: Commit the complete page narrative**

```bash
git add apps/landing tests/browser/landing.spec.mjs
git commit -m "feat: complete ArchLex developer landing story"
```

---

### Task 4: Shared Theme Compatibility in Playground and Docs

**Files:**
- Modify: `apps/playground/package.json`
- Modify: `apps/playground/src/main.tsx`
- Modify: `apps/playground/src/styles.css`
- Modify: `apps/docs/package.json`
- Modify: `apps/docs/pages/_app.tsx`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `@archlex/design` entry CSS and playground compatibility aliases from Task 1.
- Produces: both applications resolve the shared package while preserving current layouts and themes.

- [ ] **Step 1: Add shared-package dependencies**

Add `"@archlex/design": "workspace:*"` to playground and docs dependencies, then run `pnpm install`.

- [ ] **Step 2: Import the design package at both entry points**

Add `import "@archlex/design";` before local app styles in `apps/playground/src/main.tsx` and before component rendering in `apps/docs/pages/_app.tsx`. Remove the direct Fontsource imports from playground because the shared package now owns them.

- [ ] **Step 3: Remove only duplicated playground primitives**

Delete the `--font-ui`, `--font-code`, `--surface-*`, `--line*`, `--text-*`, `--accent*`, `--error`, `--warning`, `--info`, `--focus-ring`, and transition declarations now supplied through shared tokens. Preserve diagram-specific variables, component rules, and current light/dark values where they are not part of the shared contract.

- [ ] **Step 4: Run compatibility verification**

Run: `pnpm --filter @archlex/playground test && pnpm build:playground && pnpm build:docs && pnpm typecheck`

Expected: all playground unit tests PASS; both production builds and monorepo typecheck succeed.

- [ ] **Step 5: Run existing playground browser coverage**

Run: `pnpm test:browser`

Expected: existing functional and visual browser suites PASS with no unintended playground redesign.

- [ ] **Step 6: Commit compatibility adoption**

```bash
git add apps/playground apps/docs pnpm-lock.yaml
git commit -m "feat: share ArchLex design foundation across apps"
```

---

### Task 5: Responsive, Accessibility, and Final Visual Verification

**Files:**
- Modify: `tests/browser/landing.spec.mjs`
- Modify: `apps/landing/src/styles/global.css`
- Modify: landing components only when verification exposes a concrete defect.

**Interfaces:**
- Consumes: the complete landing and shared design system.
- Produces: acceptance coverage for desktop, mobile, keyboard, optional GitHub configuration, overflow, and reduced motion.

- [ ] **Step 1: Add responsive and accessibility acceptance tests**

Add tests that set viewports to `1440x1000` and `390x844`, then assert zero document-level horizontal overflow, visible primary Playground actions, a working `Skip to content` target, and a logical heading hierarchy. Add a reduced-motion context and assert the hero resolves with `animation-duration: 0s` or the computed equivalent.

Add a configured-link test by starting the landing preview with `PUBLIC_GITHUB_URL=https://github.com/example/archlex` in `playwright.landing.config.mjs`, then assert external GitHub links use that exact URL with `target="_blank"` and `rel` containing `noreferrer`.

- [ ] **Step 2: Run the expanded suite and capture concrete failures**

Run: `pnpm exec playwright test --config=playwright.landing.config.mjs`

Expected: any remaining overflow, focus, or reduced-motion defects fail with a specific locator or computed-style assertion.

- [ ] **Step 3: Fix only verified acceptance defects**

Adjust responsive grid tracks, image `object-position`, focus outlines, skip-link placement, or reduced-motion rules based on Step 2 output. Do not add new sections or marketing claims.

- [ ] **Step 4: Perform fresh full verification**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs
pnpm --filter @archlex/playground test
pnpm build:landing
pnpm build:playground
pnpm build:docs
pnpm typecheck
pnpm lint
git diff --check
```

Expected: every command exits 0; browser tests report all PASS; builds complete; TypeScript and Biome report no errors; `git diff --check` prints nothing.

- [ ] **Step 5: Visually inspect rendered desktop and mobile pages**

Start the required Astro background server with `pnpm --filter @archlex/landing astro dev --background --host 127.0.0.1 --port 4321`. Inspect the page at desktop and mobile widths, including product-image legibility, section rhythm, hover/focus states, and the final CTA. Stop it with `pnpm --filter @archlex/landing astro dev stop` after inspection.

- [ ] **Step 6: Commit final acceptance fixes**

```bash
git add apps/landing tests/browser/landing.spec.mjs playwright.landing.config.mjs
git commit -m "test: verify landing accessibility and responsiveness"
```
