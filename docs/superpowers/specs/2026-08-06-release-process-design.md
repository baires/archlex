# ArchLex Release Process Design

**Date:** 2026-08-06
**Status:** Approved

## Objective

Create a predictable release process for the open-source ArchLex monorepo. Public libraries will be distributed through npm, while the landing site, playground, and documentation will run on Cloudflare. Releases must be auditable, easy to review, and safe for maintainers and contributors.

## Guiding Decisions

- The entire monorepo is open source, but only intentional, supported APIs are published to npm.
- `@archlex/core` is the batteries-included programmatic API and works without installing internal packages separately.
- Public packages use a fixed Changesets version group and release together.
- Conventional Commits are enforced on pull-request titles, and pull requests are squash-merged.
- Changesets, rather than commit parsing alone, is the source of truth for package impact and version bumps.
- GitHub Actions validates and publishes packages through npm trusted publishing.
- Cloudflare hosts all public web applications, independently from npm releases.

## Public Package Surface

The initial `0.1.0` release publishes four packages:

- `@archlex/core`: the bundled, batteries-included programmatic API.
- `@archlex/cli`: the command-line interface.
- `@archlex/aws`: the supported AWS-specific API.
- `@archlex/gcp`: the supported GCP-specific API.

The following packages remain visible in the open-source repository but private on npm for the initial release:

- `@archlex/model`
- `@archlex/parser`
- `@archlex/diagnostics`
- `@archlex/layout-elk`
- `@archlex/renderer-svg`
- `@archlex/icons-core`
- `@archlex/icons-browser`
- `@archlex/icons-node`
- `@archlex/icons`
- `@archlex/design`
- All packages under `apps/`

Internal runtime code needed by `@archlex/core` is bundled into its published artifact. The published `@archlex/core` manifest must not reference unpublished workspace packages. `@archlex/cli` may depend on the published `@archlex/core`, `@archlex/aws`, and `@archlex/gcp` packages. Package inspection in CI will prevent unresolved `workspace:` dependencies or private-package dependencies from reaching npm.

The public surface can expand later when an internal package has a documented, stable, independently useful API. Open-source visibility alone does not imply a compatibility promise or npm publication.

## Versioning and Changelogs

The four public packages belong to one Changesets fixed group. Every npm release assigns the same version to all four packages, beginning with `0.1.0`.

Before `1.0.0`, the default version policy is:

- `fix:` produces a patch bump, such as `0.1.0` to `0.1.1`.
- `feat:` produces a minor bump, such as `0.1.1` to `0.2.0`.
- A breaking change also produces a minor bump while the project is on `0.x`, and must be prominently identified in its Changeset and release notes.
- Documentation, tests, chores, and app-only changes do not produce an npm release unless they also change a public package.

Every publishable library change includes a Changeset that names the affected public package and explains the user-visible impact. The fixed group synchronizes the actual versions. Changesets generates package changelogs and maintains a release pull request.

## Commit and Merge Policy

CI validates every pull-request title using the Conventional Commits format. Supported types initially include `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, and `revert`. Scopes are optional.

GitHub is configured to allow squash merging and to use the validated pull-request title as the commit subject. Individual work-in-progress commits within a pull request are not constrained. Direct pushes to the protected `main` branch are disabled.

Examples:

- `feat(core): add diagram validation API`
- `fix(cli): return nonzero status for invalid input`
- `docs: explain provider-specific builders`
- `feat(core)!: replace the renderer options model`

## Pull-Request Validation

Every pull request runs these required checks:

1. Validate the pull-request title.
2. Install dependencies with the frozen pnpm lockfile using the repository's supported Node and pnpm versions.
3. Build all affected workspaces.
4. Run typechecking, linting, and unit tests.
5. Run relevant browser tests for landing or playground changes.
6. Build and dry-run-pack all public packages.
7. Inspect packed files and normalized manifests for missing outputs, unintended files, private dependencies, and unresolved `workspace:` ranges.
8. Require a Changeset when a public package's source or public artifact changes, with an explicit maintainer override for non-user-facing maintenance.
9. Produce Cloudflare preview deployments for affected applications.

Required checks are enforced through branch protection. Turbo filters and Cloudflare build-watch paths should avoid unrelated application builds without weakening checks for shared package changes.

## npm Release Workflow

Merges to `main` containing Changesets cause the Changesets action to create or update a release pull request. That pull request contains synchronized versions and generated changelogs. Maintainers review it as the release approval gate.

Merging the release pull request starts one concurrency-controlled publishing workflow:

1. Re-run the complete validation suite.
2. Build the four public packages.
3. Pack and inspect the exact artifacts that will be published.
4. Publish through npm trusted publishing using GitHub Actions OIDC.
5. Verify that all four expected package versions are available from the npm registry.
6. Create the matching `v<version>` Git tag and GitHub release only after npm verification succeeds.
7. Install the published packages in a clean temporary project and run minimal import and CLI smoke tests.

The public GitHub repository, public npm packages, GitHub-hosted runner, current npm CLI, and `id-token: write` workflow permission enable npm provenance attestations. Long-lived npm write tokens are not used once trusted publishing is configured. Each public package is configured on npm to trust the exact publishing workflow.

The initial releases use a protected GitHub environment with explicit maintainer approval. This gate can be relaxed after the process has proven reliable. Because npm trusted publishers are configured from an existing package's settings, brand-new package names require a one-time bootstrap: a maintainer stages the verified `0.1.0` artifacts while interactively authenticated, approves them with 2FA, verifies all four registry entries, and then binds each package to the trusted workflow. This bootstrap uses no stored CI write token. Subsequent releases use OIDC exclusively.

## Cloudflare Deployment Architecture

Web deployment is independent of npm publication:

| Application | Platform | Production source | Output/runtime |
| --- | --- | --- | --- |
| Landing | Cloudflare Pages | `main` | Astro static output from `apps/landing/dist` |
| Playground | Cloudflare Pages | `main` | Vite static output from `apps/playground/dist` |
| Documentation | Cloudflare Pages | `main` | Next/Nextra static export from `apps/docs/out` |

The intended domain layout is:

- `archlex.dev` for the landing site.
- `playground.archlex.dev` for the playground.
- `docs.archlex.dev` for documentation.

Each application has an independent Cloudflare Pages project. Pull requests receive preview deployments. Production deploys come from `main`; build-watch paths prevent changes isolated to one app from rebuilding every other app. Changes to shared packages trigger every dependent application. The documentation remains a static export until it needs server-side rendering, route handlers, server actions, or another runtime-only feature; that future requirement would justify a separate migration to Cloudflare Workers.

Production verification checks that each site responds successfully. The playground smoke test also renders a representative diagram. Cloudflare retains its existing production deployment when a new build fails.

## Failure and Recovery Policy

npm versions are immutable. A faulty release is fixed forward with a new patch version, such as `0.1.1`; a seriously unsafe version may be deprecated. Published versions are not normally unpublished.

If npm publishing partially succeeds, the workflow stops and reports exactly which packages were published. It must never attempt to overwrite an existing version. Recovery uses a new synchronized version after correcting the failure. The publishing workflow permits only one active release at a time.

Cloudflare applications roll back independently to their last known-good deployments. A failed web deployment does not roll back an npm release, and a failed npm release does not disturb existing Cloudflare deployments.

Tags and GitHub releases are not created until all four npm packages have been published and verified. If post-publication smoke tests fail, the release is marked as needing remediation and a fix-forward release is prepared; the already-published artifacts remain immutable.

## Initial Release Sequence

1. Choose the open-source license and add the license file.
2. Review dependency licenses and AWS/GCP icon usage terms.
3. Add package metadata: license, repository, homepage, bugs, author, files, exports, engines, and public publish configuration.
4. Make only the four supported packages publishable and configure the Changesets fixed group.
5. Ensure `@archlex/core` bundles its internal runtime and that every public tarball passes inspection.
6. Reserve and configure the `@archlex` npm organization or scope.
7. Add GitHub pull-request validation, branch protection, squash merging, the release workflow, and protected release environment.
8. Configure the three Cloudflare Pages projects, including domains, previews, and build-watch paths.
9. Test all workflows with Cloudflare previews and npm dry runs.
10. Merge the initial release pull request, stage the four new `0.1.0` packages, and approve them with maintainer 2FA.
11. Verify all four registry entries, then configure npm trusted publishing for subsequent releases.
12. Verify clean external installation, imports, the CLI, registry metadata, GitHub release, and all production sites.
13. Update the README with npm installation instructions and live site URLs, then publish the launch announcement.

## Out of Scope for the Initial Release

- Independent versions for public packages.
- Publishing internal implementation packages.
- Continuous publication on every merge.
- A prerelease or nightly npm channel.
- Migrating the current statically exported Next/Nextra documentation to another framework or a Worker runtime.
- Automatically rolling back immutable npm releases.

These can be reconsidered after the `0.x` release process has operated successfully.

## Success Criteria

The process is ready when:

- A contributor can understand whether a change needs a Changeset.
- Invalid pull-request titles and unsafe package artifacts are rejected before merge.
- A maintainer can publish all four packages by reviewing and merging one release pull request without handling an npm write token.
- All four public packages carry the same version and install successfully from a clean project.
- `@archlex/core` works without direct installation of internal packages.
- Landing, playground, and documentation receive independent previews and production deployments on Cloudflare.
- A failed package or site release has an explicit, tested recovery path.
