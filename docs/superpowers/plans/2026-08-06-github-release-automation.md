# GitHub Release Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce clean pull-request history and publish the verified fixed package group from an approved Changesets release pull request.

**Architecture:** Pull-request CI separates title, Changeset, repository, and artifact checks into required jobs. A concurrency-controlled release workflow uses Changesets for version PRs and npm trusted publishing for immutable releases, then verifies registry state before tags and GitHub releases are considered successful.

**Tech Stack:** GitHub Actions, pnpm 9, Node.js 22.14+, npm 11.5.1+, Changesets, npm OIDC trusted publishing.

## Global Constraints

- PR titles use Conventional Commits; individual commits are unrestricted.
- `main` accepts squash merges only and disallows direct pushes.
- No long-lived npm write token is used.
- Publishing runs on a GitHub-hosted runner with `id-token: write`.
- Only one release workflow may publish at a time.
- npm tags and GitHub releases represent the synchronized four-package version.

---

### Task 1: Enforce pull-request titles

**Files:**
- Create: `.github/workflows/pr-title.yml`
- Create: `scripts/validate-pr-title.mjs`
- Test: `tests/validate-pr-title.test.ts`

**Interfaces:**
- Produces: `validatePrTitle(title: string): { valid: true } | { valid: false; reason: string }`.

- [ ] **Step 1: Write table-driven title tests**

Accept `feat(core): add validation`, `fix: avoid blank output`, and `feat(core)!: change options`. Reject missing types, uppercase types, terminal periods, and unsupported types. The supported type set is `feat|fix|docs|test|refactor|perf|build|ci|chore|revert`.

- [ ] **Step 2: Run the test and confirm the validator is missing**

Run: `pnpm vitest run tests/validate-pr-title.test.ts`

Expected: FAIL due to the missing module.

- [ ] **Step 3: Implement the validator and workflow**

The workflow runs only on `pull_request` activity types `opened`, `edited`, `synchronize`, and `reopened`, passes `${{ github.event.pull_request.title }}` through the `PR_TITLE` environment variable, and runs `node scripts/validate-pr-title.mjs "$PR_TITLE"`. Avoid interpolating the title directly into shell source.

- [ ] **Step 4: Run tests and syntax-check workflows**

Run: `pnpm vitest run tests/validate-pr-title.test.ts && pnpm biome check scripts/validate-pr-title.mjs tests/validate-pr-title.test.ts .github/workflows/pr-title.yml`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pr-title.yml scripts/validate-pr-title.mjs tests/validate-pr-title.test.ts
git commit -m "ci: validate pull request titles"
```

### Task 2: Add Changeset and artifact gates to CI

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `scripts/require-changeset.mjs`
- Test: `tests/require-changeset.test.ts`

**Interfaces:**
- Consumes: public package paths from `scripts/public-packages.mjs`.
- Produces: `requiresChangeset(changedPaths: string[]): boolean` and separate required CI jobs named `check`, `package-artifacts`, and `changeset`.

- [ ] **Step 1: Test change classification**

Require a Changeset for `packages/core/src/index.ts`, `packages/aws/src/registry.ts`, and package build configuration. Do not require one for `apps/playground/src/App.tsx`, Markdown-only edits, tests, or `.github/**`. Treat changes to shared public-artifact scripts as requiring a Changeset.

- [ ] **Step 2: Implement base/head diff classification**

Read newline-delimited paths from stdin for unit tests. In CI, fetch the PR base SHA and call `git diff --name-only "$BASE_SHA" "$HEAD_SHA"`; pass SHAs via environment variables, not shell interpolation. Permit an override only through a `no-changeset-required` PR label, and print the reason.

- [ ] **Step 3: Split CI into explicit jobs**

Keep frozen install and `pnpm check` in `check`. Add `package-artifacts` running `pnpm verify:packages`. Add `changeset` with `pull-requests: read` and `contents: read`; skip the requirement for Changesets-generated release PRs.

- [ ] **Step 4: Verify locally**

Run: `pnpm vitest run tests/require-changeset.test.ts && pnpm verify:packages && pnpm check`

Expected: all checks PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml scripts/require-changeset.mjs tests/require-changeset.test.ts
git commit -m "ci: require changesets and safe artifacts"
```

### Task 3: Create the release pull-request and publish workflow

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `scripts/verify-registry-release.mjs`
- Test: `tests/verify-registry-release.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `verifyRegistryRelease({ version, packages, fetch }): Promise<void>` and a workflow that either updates the Changesets release PR or publishes the fixed group.

- [ ] **Step 1: Test registry verification**

Mock registry responses and assert success only when all four package documents contain the expected version. Assert bounded retry behavior for eventual consistency and an error listing missing packages after the final attempt.

- [ ] **Step 2: Implement registry verification**

Query `https://registry.npmjs.org/<encoded-package>/<version>` for each public name, retry five times with 3-second intervals, and exit nonzero with a deterministic package list on failure. Accept `RELEASE_VERSION` from the environment.

- [ ] **Step 3: Add the release workflow**

Trigger on pushes to `main` and manual dispatch. Set `concurrency.group: npm-release` and `cancel-in-progress: false`. Grant `contents: write`, `pull-requests: write`, and `id-token: write`. Use a protected `release` environment. Install Node 22.14+ and then `npm install --global npm@^11.5.1`. Run frozen pnpm install, `pnpm check`, and `pnpm verify:packages` before `changesets/action@v1` with `publish: pnpm release` and GitHub release creation disabled. After publication, derive the synchronized version, run `scripts/verify-registry-release.mjs`, and only then create the `v<version>` tag and GitHub release with `gh release create`. Expose the Changesets `published` and `publishedPackages` outputs so tag creation runs only for a successful publication.

- [ ] **Step 4: Verify workflow and helper**

Run: `pnpm vitest run tests/verify-registry-release.test.ts && pnpm biome check .github/workflows/release.yml scripts/verify-registry-release.mjs tests/verify-registry-release.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml scripts/verify-registry-release.mjs tests/verify-registry-release.test.ts package.json
git commit -m "ci: automate trusted npm releases"
```

### Task 4: Bootstrap new npm package names and document external controls

**Files:**
- Create: `docs/releasing.md`
- Modify: `CONTRIBUTING.md`
- Modify: `PRE-RELEASE-CHECKLIST.md`

**Interfaces:**
- Produces: an operator runbook with exact one-time settings and recovery commands.

- [ ] **Step 1: Document GitHub repository settings**

Require pull requests on `main`; require `PR title / validate`, `CI / check`, `CI / package-artifacts`, and `CI / changeset`; require branches to be current; dismiss stale approvals; block force pushes/deletion/direct pushes; enable squash merge only; set the default squash message to PR title and commit details. Create protected environment `release` with required reviewers.

- [ ] **Step 2: Bootstrap the four previously unpublished package names**

After the release PR has produced verified `0.1.0` tarballs, sign in interactively with a maintainer npm account, run `npm stage publish --access public` for each package artifact, inspect the staged contents on npm, and approve each stage with 2FA. Verify all four `0.1.0` registry entries before creating the Git tag and GitHub release. Do not create or store a CI write token for this bootstrap.

- [ ] **Step 3: Document npm trusted publishers**

For each now-existing package, select GitHub Actions, repository `baires/archlex`, workflow filename `release.yml`, environment `release`, and allowed action `npm publish`. Test OIDC on the next patch release; after it succeeds, disallow token publishing and revoke obsolete automation tokens.

- [ ] **Step 4: Document release and recovery operations**

Cover reviewing the Changesets PR, checking all four registry versions, clean install smoke testing, partial-publish diagnosis with `npm view <name> versions --json`, fix-forward versioning, and `npm deprecate <name>@<version> "Use <fixed-version>; release issue"` for unsafe versions. State that normal unpublish is forbidden.

- [ ] **Step 5: Check documentation**

Run: `pnpm biome check docs/releasing.md CONTRIBUTING.md PRE-RELEASE-CHECKLIST.md`

Expected: PASS with no unresolved placeholder markers.

- [ ] **Step 6: Commit**

```bash
git add docs/releasing.md CONTRIBUTING.md PRE-RELEASE-CHECKLIST.md
git commit -m "docs: add release operations runbook"
```
