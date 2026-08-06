# Cloudflare Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the landing, playground, and statically exported docs as independent Cloudflare Pages projects with preview and production verification.

**Architecture:** Each app remains a static build and owns a small deployment descriptor consumed by a shared verification script. Cloudflare Git integration builds from the monorepo, creates PR previews, promotes `main` to production, and uses watch paths that include the app plus its shared dependencies.

**Tech Stack:** Cloudflare Pages, pnpm 9, Turbo, Astro 5, Vite 6, Next.js 15 static export, Playwright.

## Global Constraints

- Landing output is `apps/landing/dist`.
- Playground output is `apps/playground/dist`.
- Docs output is `apps/docs/out`; no Worker/OpenNext runtime is introduced.
- `main` is the production branch; pull requests receive preview URLs.
- Intended domains are `archlex.dev`, `playground.archlex.dev`, and `docs.archlex.dev`.
- npm publishing and site deployment remain independent.

---

### Task 1: Codify static application builds

**Files:**
- Create: `scripts/site-projects.mjs`
- Create: `tests/site-projects.test.ts`
- Modify: `apps/landing/package.json`
- Modify: `apps/playground/package.json`
- Modify: `apps/docs/package.json`

**Interfaces:**
- Produces: `SITE_PROJECTS`, containing `name`, `workspace`, `outputDirectory`, `domain`, and `smokePath` for all three sites.

- [ ] **Step 1: Write the static-site contract test**

Assert the exact triples `landing/@archlex/landing/apps/landing/dist`, `playground/@archlex/playground/apps/playground/dist`, and `docs/@archlex/docs/apps/docs/out`; assert unique production domains and `/` smoke paths.

- [ ] **Step 2: Run the test and confirm the module is absent**

Run: `pnpm vitest run tests/site-projects.test.ts`

Expected: FAIL because `scripts/site-projects.mjs` does not exist.

- [ ] **Step 3: Implement the descriptor and consistent preview scripts**

Export a frozen `SITE_PROJECTS` array. Ensure each app has `build` and a local static `preview` command; docs preview must serve `out/` after `next build`, not start a Next server.

- [ ] **Step 4: Build and assert output entry points**

Run: `pnpm turbo build --filter=@archlex/landing --filter=@archlex/playground --filter=@archlex/docs && test -f apps/landing/dist/index.html && test -f apps/playground/dist/index.html && test -f apps/docs/out/index.html && pnpm vitest run tests/site-projects.test.ts`

Expected: PASS with three static `index.html` files.

- [ ] **Step 5: Commit**

```bash
git add scripts/site-projects.mjs tests/site-projects.test.ts apps/landing/package.json apps/playground/package.json apps/docs/package.json
git commit -m "build: codify static site outputs"
```

### Task 2: Remove Vercel-specific configuration

**Files:**
- Delete: `vercel.json`
- Delete: `apps/landing/vercel.json`
- Delete: `apps/playground/vercel.json`
- Delete: `apps/docs/vercel.json`
- Modify: `README.md`
- Modify: `PRE-RELEASE-CHECKLIST.md`

**Interfaces:**
- Produces: provider-neutral static apps with Cloudflare documented as the sole deployment target.

- [ ] **Step 1: Search for deployment-provider references**

Run: `rg -n "Vercel|vercel|Netlify|GitHub Pages|Cloudflare" README.md PRE-RELEASE-CHECKLIST.md apps vercel.json`

Expected: Vercel configuration and stale hosting options are reported.

- [ ] **Step 2: Remove Vercel files and update documentation**

State that all three apps use Cloudflare Pages and that production domains are configured externally. Preserve local build/preview instructions.

- [ ] **Step 3: Verify no stale provider configuration remains**

Run: `test ! -e vercel.json && ! rg -n "Vercel|vercel|Netlify|GitHub Pages" README.md PRE-RELEASE-CHECKLIST.md apps --glob '!**/node_modules/**'`

Expected: exit status 0.

- [ ] **Step 4: Commit**

```bash
git add -A vercel.json apps/landing/vercel.json apps/playground/vercel.json apps/docs/vercel.json README.md PRE-RELEASE-CHECKLIST.md
git commit -m "chore: standardize hosting on Cloudflare Pages"
```

### Task 3: Add production smoke verification

**Files:**
- Create: `scripts/verify-sites.mjs`
- Create: `tests/verify-sites.test.ts`
- Modify: `package.json`
- Modify: `tests/browser/playground-workspace.spec.mjs`

**Interfaces:**
- Produces: `verifySite(project, fetch): Promise<void>` and root command `pnpm verify:sites`.

- [ ] **Step 1: Test HTTP verification behavior**

Mock successful HTML, redirects, 404, 500, and non-HTML responses. Require a 2xx response after redirects and `text/html` content. Include the failing site name and URL in errors.

- [ ] **Step 2: Implement the verifier**

Read optional `LANDING_URL`, `PLAYGROUND_URL`, and `DOCS_URL`; default to the production HTTPS domains from `SITE_PROJECTS`. Apply a 15-second `AbortSignal.timeout` to each request and verify all sites concurrently while reporting every failure.

- [ ] **Step 3: Add a deployed-playground browser smoke path**

Allow the existing Playwright playground test to use `PLAYGROUND_URL` as `baseURL`. The smoke assertion must load a representative built-in example and confirm an SVG diagram with at least one node is visible.

- [ ] **Step 4: Run local tests**

Run: `pnpm vitest run tests/verify-sites.test.ts && pnpm playwright test tests/browser/playground-workspace.spec.mjs`

Expected: PASS against local preview configuration.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-sites.mjs tests/verify-sites.test.ts package.json tests/browser/playground-workspace.spec.mjs
git commit -m "test: verify deployed Cloudflare sites"
```

### Task 4: Configure the three Cloudflare Pages projects

**Files:**
- Create: `docs/cloudflare-pages.md`
- Modify: `PRE-RELEASE-CHECKLIST.md`

**Interfaces:**
- Consumes: `SITE_PROJECTS` build outputs and domains.
- Produces: reproducible dashboard settings for `archlex-landing`, `archlex-playground`, and `archlex-docs`.

- [ ] **Step 1: Document shared build settings**

For every project set production branch `main`, repository root as the build root, environment variable `NODE_VERSION=22`, install command `pnpm install --frozen-lockfile`, and preview deployments enabled. Use build commands `pnpm build:landing`, `pnpm build:playground`, and `pnpm build:docs` with output directories `apps/landing/dist`, `apps/playground/dist`, and `apps/docs/out` respectively.

- [ ] **Step 2: Document watch paths**

Landing includes `apps/landing/**`, `packages/design/**`, root lock/config files. Playground includes `apps/playground/**`, `packages/**`, root lock/config files. Docs includes `apps/docs/**`, `packages/design/**`, `docs/**`, root lock/config files. Explicitly state that shared configuration changes must trigger all three projects.

- [ ] **Step 3: Document domains and deployment checks**

Attach `archlex.dev`, `playground.archlex.dev`, and `docs.archlex.dev`; retain generated `pages.dev` domains for diagnostics. Record how to inspect a preview, promote `main`, and roll back by selecting the last known-good production deployment in Cloudflare.

- [ ] **Step 4: Create projects through Cloudflare Git integration**

Connect the public GitHub repository to three Pages projects using the settings above. Open a test pull request that touches one app and confirm only the expected project plus shared dependents build. This is an external-state step and requires a maintainer with Cloudflare and GitHub organization access.

- [ ] **Step 5: Verify production after merge**

Run: `pnpm verify:sites && PLAYGROUND_URL=https://playground.archlex.dev pnpm playwright test tests/browser/playground-workspace.spec.mjs`

Expected: three sites return HTML and the production playground renders a representative SVG.

- [ ] **Step 6: Commit documentation and checklist state**

```bash
git add docs/cloudflare-pages.md PRE-RELEASE-CHECKLIST.md
git commit -m "docs: add Cloudflare Pages runbook"
```

### Task 5: Final cross-system release rehearsal

**Files:**
- Modify: `PRE-RELEASE-CHECKLIST.md`
- Modify: `docs/releasing.md`
- Modify: `docs/cloudflare-pages.md`

**Interfaces:**
- Consumes: `pnpm verify:packages`, GitHub release checks, and `pnpm verify:sites`.
- Produces: evidence that npm and Cloudflare paths are independently releasable.

- [ ] **Step 1: Rehearse a non-publishing package release**

Run: `pnpm install --frozen-lockfile && pnpm check && pnpm verify:packages && pnpm changeset status`

Expected: all repository and tarball checks pass without contacting npm publish endpoints.

- [ ] **Step 2: Rehearse all local static builds**

Run: `pnpm build:landing && pnpm build:playground && pnpm build:docs`

Expected: the three documented output directories contain `index.html`.

- [ ] **Step 3: Verify Cloudflare production independently**

Run: `pnpm verify:sites`

Expected: all production endpoints pass even though no npm publish occurred.

- [ ] **Step 4: Record rehearsal evidence**

Add the date, tested commit SHA, commands, and pass/fail result to the checklist. Do not mark npm `0.1.0` published until registry verification succeeds.

- [ ] **Step 5: Commit**

```bash
git add PRE-RELEASE-CHECKLIST.md docs/releasing.md docs/cloudflare-pages.md
git commit -m "docs: record release rehearsal"
```
