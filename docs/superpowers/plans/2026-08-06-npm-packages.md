# npm Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce safe, self-contained `0.1.0` npm artifacts for `@archlex/core`, `@archlex/cli`, `@archlex/aws`, and `@archlex/gcp`.

**Architecture:** Vite bundles private workspace implementation packages into the four supported artifacts. A repository-owned pack verifier treats generated tarballs as the release boundary and rejects private dependencies, workspace ranges, missing entry points, and unintended files.

**Tech Stack:** pnpm 9, Node.js 22, Vite 6, TypeScript 5.7, Changesets, npm pack.

## Global Constraints

- All four public packages start at `0.1.0` and use one fixed Changesets version group.
- `@archlex/core` must work without directly installing any private `@archlex/*` package.
- Apps and implementation packages remain `private: true`.
- Published packages use ESM and require Node.js `>=22.0.0`.
- No published manifest may contain an unresolved `workspace:` range.
- The repository URL used in package metadata is `https://github.com/archlex/archlex`; if the actual public repository differs, replace this value consistently before executing Task 2.

---

### Task 1: Lock the license and public-package contract

**Files:**
- Create: `LICENSE`
- Create: `scripts/public-packages.mjs`
- Test: `tests/public-packages.test.ts`
- Modify: `PRE-RELEASE-CHECKLIST.md`

**Interfaces:**
- Produces: `PUBLIC_PACKAGES: readonly ["@archlex/core", "@archlex/cli", "@archlex/aws", "@archlex/gcp"]` and `PRIVATE_WORKSPACE_PACKAGES: readonly string[]`.

- [ ] **Step 1: Record the four-package contract in a failing test**

```ts
import { expect, test } from "vitest";
import { PUBLIC_PACKAGES } from "../scripts/public-packages.mjs";

test("publishes only the supported package surface", () => {
  expect(PUBLIC_PACKAGES).toEqual([
    "@archlex/core",
    "@archlex/cli",
    "@archlex/aws",
    "@archlex/gcp",
  ]);
});
```

- [ ] **Step 2: Run the focused test and confirm the module is missing**

Run: `pnpm vitest run tests/public-packages.test.ts`

Expected: FAIL because `scripts/public-packages.mjs` does not exist.

- [ ] **Step 3: Add `scripts/public-packages.mjs` with the exact public list and derive the private list from workspace manifests**

Export `PUBLIC_PACKAGES`, `readWorkspacePackages()`, and `PRIVATE_WORKSPACE_PACKAGES`. Use `node:fs/promises` and `node:path`; do not duplicate package paths in later scripts.

- [ ] **Step 4: Add the chosen license**

Use the maintainer-approved SPDX license text verbatim in `LICENSE`. Apache-2.0 is the recommended default because it includes an explicit patent grant; do not publish until the maintainer has approved the license. Mark the legal/license checklist entries complete only after dependency and AWS/GCP icon terms have been reviewed.

- [ ] **Step 5: Run the contract test**

Run: `pnpm vitest run tests/public-packages.test.ts`

Expected: PASS with exactly four public packages.

- [ ] **Step 6: Commit**

```bash
git add LICENSE scripts/public-packages.mjs tests/public-packages.test.ts PRE-RELEASE-CHECKLIST.md
git commit -m "chore: define public package contract"
```

### Task 2: Add complete npm metadata

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/cli/package.json`
- Modify: `packages/aws/package.json`
- Modify: `packages/gcp/package.json`
- Modify: `README.md`
- Test: `tests/public-packages.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_PACKAGES` and `readWorkspacePackages()` from `scripts/public-packages.mjs`.
- Produces: four public manifests with `private` removed, `publishConfig.access = "public"`, and complete npm metadata.

- [ ] **Step 1: Extend the manifest test**

Assert for every public manifest: version `0.1.0`; no `private`; `license` equals the approved SPDX identifier; `repository.type` is `git`; `repository.url` is `git+https://github.com/archlex/archlex.git`; `repository.directory` points to the package folder; `homepage` is `https://archlex.dev`; `bugs.url` is `https://github.com/archlex/archlex/issues`; `engines.node` is `>=22.0.0`; `publishConfig.access` is `public`; and `files` contains only `dist`, `README.md`, and `LICENSE` as applicable.

- [ ] **Step 2: Run the test and confirm current manifests fail**

Run: `pnpm vitest run tests/public-packages.test.ts`

Expected: FAIL because all four packages are private and lack publication metadata.

- [ ] **Step 3: Update the four manifests and root scripts**

Add root scripts:

```json
{
  "changeset": "changeset",
  "version-packages": "changeset version",
  "release": "pnpm check && pnpm verify:packages && changeset publish",
  "verify:packages": "node scripts/verify-packages.mjs"
}
```

Keep the CLI `bin.archlex` entry. Add `prepack: "pnpm build"` to each public package. Copy the root license during verification or include it through the packaging script; never reference files above a package root in `files`.

- [ ] **Step 4: Correct README installation guidance**

Change the default installation command to `npm install @archlex/core`. Add separate CLI and advanced provider-package installation examples. Replace `your-org` and workspace-filter examples with the actual repository and package names.

- [ ] **Step 5: Run metadata tests and formatting**

Run: `pnpm vitest run tests/public-packages.test.ts && pnpm biome check package.json packages/{core,cli,aws,gcp}/package.json README.md`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json packages/core/package.json packages/cli/package.json packages/aws/package.json packages/gcp/package.json README.md tests/public-packages.test.ts
git commit -m "chore: prepare public npm manifests"
```

### Task 3: Make public artifacts self-contained

**Files:**
- Modify: `packages/core/vite.config.ts`
- Modify: `packages/cli/vite.config.ts`
- Modify: `packages/aws/vite.config.ts`
- Modify: `packages/gcp/vite.config.ts`
- Test: `tests/node-import.test.ts`
- Test: `tests/browser/phase-one.spec.mjs`

**Interfaces:**
- Produces: built artifacts whose runtime imports contain no private `@archlex/*` package names.

- [ ] **Step 1: Add artifact-boundary assertions**

After building, read each public package's `dist/**/*.js`. Assert that `core`, `aws`, and `gcp` do not import any package in `PRIVATE_WORKSPACE_PACKAGES`; assert that CLI imports only the three other public packages and third-party/Node dependencies.

- [ ] **Step 2: Run the focused build and prove current externals violate the contract**

Run: `pnpm turbo build --filter=@archlex/core --filter=@archlex/cli --filter=@archlex/aws --filter=@archlex/gcp && pnpm vitest run tests/public-packages.test.ts`

Expected: FAIL with private imports such as `@archlex/model` or `@archlex/diagnostics` in generated artifacts.

- [ ] **Step 3: Narrow Vite externals**

Remove private workspace packages from all four `rollupOptions.external` arrays. Keep Node built-ins and intentional third-party runtime dependencies external. For CLI, keep only `@archlex/core`, `@archlex/aws`, and `@archlex/gcp` as external ArchLex dependencies and bundle `model` and `diagnostics`.

- [ ] **Step 4: Verify Node and browser entry points**

Run: `pnpm turbo build --filter=@archlex/core --filter=@archlex/cli --filter=@archlex/aws --filter=@archlex/gcp && pnpm vitest run tests/public-packages.test.ts tests/node-import.test.ts && pnpm playwright test tests/browser/phase-one.spec.mjs`

Expected: all tests PASS; `@archlex/core` and `@archlex/core/browser` import successfully.

- [ ] **Step 5: Commit**

```bash
git add packages/core/vite.config.ts packages/cli/vite.config.ts packages/aws/vite.config.ts packages/gcp/vite.config.ts tests/public-packages.test.ts tests/node-import.test.ts tests/browser/phase-one.spec.mjs
git commit -m "build: bundle private runtime packages"
```

### Task 4: Verify exact tarballs in clean consumers

**Files:**
- Create: `scripts/verify-packages.mjs`
- Create: `tests/fixtures/package-consumer/node-smoke.mjs`
- Create: `tests/fixtures/package-consumer/browser-smoke.ts`
- Test: `tests/public-packages.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `pnpm verify:packages`, exiting nonzero on an unsafe manifest, missing file, failed clean install, failed import, or failed CLI invocation.

- [ ] **Step 1: Test verifier failure conditions**

Export `inspectManifest(manifest, privateNames)` and test that it rejects `private: true`, any `workspace:` range, dependencies on private names, missing `exports`, and a CLI manifest without `bin.archlex`.

- [ ] **Step 2: Run the tests and confirm the verifier is missing**

Run: `pnpm vitest run tests/public-packages.test.ts`

Expected: FAIL because `inspectManifest` is not exported.

- [ ] **Step 3: Implement tarball verification**

For each public package, run `pnpm --filter <name> pack --pack-destination <mkdtemp>`; inspect with `tar -tf`; extract it; validate the packed manifest; install all four tarballs into a second temporary directory using `npm install --ignore-scripts`; execute `node-smoke.mjs`; run `npx archlex --help`; and always remove temporary directories in `finally`.

- [ ] **Step 4: Add smoke fixtures**

`node-smoke.mjs` imports the documented `@archlex/core` entry point, asserts its primary factory/render exports exist, imports `@archlex/aws` and `@archlex/gcp`, and renders the smallest supported example. `browser-smoke.ts` imports `@archlex/core/browser` and is typechecked by a minimal temporary Vite consumer created by the verifier.

- [ ] **Step 5: Run the full artifact check**

Run: `pnpm verify:packages`

Expected: four tarballs pass inspection, clean installation, Node import, browser build, and CLI help.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-packages.mjs tests/public-packages.test.ts tests/fixtures/package-consumer .gitignore
git commit -m "test: verify published package artifacts"
```

### Task 5: Configure fixed Changesets versions

**Files:**
- Modify: `.changeset/config.json`
- Create: `.changeset/README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `PRE-RELEASE-CHECKLIST.md`

**Interfaces:**
- Produces: one fixed release group for the four public packages and contributor guidance mapping `fix`, `feat`, and breaking changes to pre-1.0 bumps.

- [ ] **Step 1: Update Changesets configuration**

Set `access` to `public`, `fixed` to one array containing the four public names, and `ignore` to every private workspace package. Keep `baseBranch: "main"` and `updateInternalDependencies: "patch"`.

- [ ] **Step 2: Document the author workflow**

Explain `pnpm changeset`, user-facing summaries, patch for fixes, minor for features and pre-1.0 breaking changes, and no Changeset for app-only/docs/test/chore changes. Include the exact command `pnpm changeset status --since=main`.

- [ ] **Step 3: Validate Changesets and package artifacts**

Run: `pnpm changeset status && pnpm verify:packages && pnpm check`

Expected: configuration parses, package verification passes, and repository checks pass.

- [ ] **Step 4: Commit**

```bash
git add .changeset/config.json .changeset/README.md CONTRIBUTING.md PRE-RELEASE-CHECKLIST.md
git commit -m "chore: configure fixed package releases"
```

