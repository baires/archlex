# Release Operations Guide

This guide covers release procedures, site deployment verification, and recovery operations for ArchLex.

## Pre-Release Rehearsal

Before the first public release, all systems should be rehearsed locally to ensure they work correctly.

### Last Rehearsal

**Date:** 2026-08-06
**Commit:** 7db06a3
**Status:** ✅ PASSED

**Commands Executed:**
```bash
# Repository and package checks
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm verify:packages && pnpm changeset status

# Static site builds
pnpm build:landing && pnpm build:playground && pnpm build:docs

# Site verification (will test production once deployed)
pnpm verify:sites
```

**Results:**
- ✅ All packages built successfully
- ✅ Typecheck passed
- ✅ Package artifacts verified (379 services validated)
- ✅ Changeset status: 13 packages ready for 0.1.0 release
- ✅ Landing site built (apps/landing/dist/index.html)
- ✅ Playground site built (apps/playground/dist/index.html)
- ✅ Docs site built (apps/docs/out/index.html)
- ⏳ Production site verification: Pending deployment to Cloudflare Pages

**Note:** npm 0.1.0 packages are NOT yet published. This rehearsal verifies the build pipeline only.

## Release Process

### 1. Create a Changeset

When making changes to published packages:

```bash
pnpm changeset
```

Select affected packages, choose version bump type (patch/minor/major), and describe changes.

### 2. Version Packages

When ready to release:

```bash
pnpm version
```

This updates package.json versions, generates CHANGELOGs, and consumes changesets.

### 3. Publish to npm

```bash
pnpm release
```

This builds all packages and publishes them to npm.

**Or use automated workflow:**
1. Merge changesets to main
2. GitHub Actions creates "Version Packages" PR
3. Review and merge the PR
4. GitHub Actions automatically publishes to npm

### 4. Verify npm Packages

After publishing, verify packages are available:

```bash
npm view @archlex/core
npm view @archlex/aws
npm view @archlex/gcp
npm view @archlex/cli
# ... check all packages
```

### 5. Verify Cloudflare Pages Deployments

After merging to main, verify all sites deployed:

```bash
pnpm verify:sites
```

Expected output:
```
✓ All 3 sites verified successfully
```

### 6. Run Deployed Playground Smoke Test

```bash
PLAYGROUND_URL=https://playground.archlex.dev pnpm test:browser tests/browser/deployed-playground.spec.mjs
```

Expected: All tests pass

## Site Deployment

Sites are automatically deployed to Cloudflare Pages when changes are pushed to main.

### Deployment URLs

- **Landing:** https://archlex.dev
- **Playground:** https://playground.archlex.dev
- **Docs:** https://docs.archlex.dev

### Manual Site Verification

```bash
# Verify all sites
pnpm verify:sites

# Verify with custom URLs (e.g., preview deployments)
LANDING_URL=https://preview.archlex-landing.pages.dev \
PLAYGROUND_URL=https://preview.archlex-playground.pages.dev \
DOCS_URL=https://preview.archlex-docs.pages.dev \
pnpm verify:sites
```

### Viewing Site Deployment Logs

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select the project (archlex-landing, archlex-playground, or archlex-docs)
4. View recent deployments and logs

## Recovery Procedures

### Partial npm Publish Failure

If some packages fail to publish:

1. **Check which packages published:**
   ```bash
   npm view @archlex/core versions --json
   npm view @archlex/aws versions --json
   npm view @archlex/gcp versions --json
   # ... check all packages
   ```

2. **Identify missing packages:**
   Compare published versions with package.json versions

3. **Fix-forward with patch version:**
   ```bash
   # Create a new changeset for failed packages
   pnpm changeset
   # Version and republish
   pnpm version
   pnpm release
   ```

4. **DO NOT unpublish:** npm has strict unpublish policies. Always fix forward.

### Unsafe Published Version

If a critical bug is discovered in a published version:

1. **Deprecate the unsafe version:**
   ```bash
   npm deprecate @archlex/core@0.1.0 "Use 0.1.1; critical issue fixed"
   ```

2. **Publish fixed version immediately:**
   ```bash
   # Create fix changeset
   pnpm changeset
   # Version as patch
   pnpm version
   # Publish fix
   pnpm release
   ```

3. **Update documentation** to recommend the fixed version

### Site Deployment Failure

If a Cloudflare Pages deployment fails:

1. **Check build logs** in Cloudflare Dashboard

2. **Common issues:**
   - Node version mismatch (should be 22)
   - Missing build command
   - Wrong output directory
   - Build timeout

3. **Rollback if needed:**
   - Go to Cloudflare Dashboard > Pages > [Project]
   - Find previous successful deployment
   - Click "Rollback to this deployment"

4. **Fix and redeploy:**
   - Fix the issue in code
   - Commit and push
   - Cloudflare automatically rebuilds

### Clean Install Smoke Test

After publishing, test that packages work in a fresh environment:

```bash
# Create test directory
mkdir /tmp/archlex-test
cd /tmp/archlex-test

# Install CLI
npm install -g @archlex/cli

# Test CLI
archlex --version

# Create test project
mkdir test-diagram
cd test-diagram
npm init -y
npm install @archlex/core @archlex/aws

# Test programmatic API
node -e "import('@archlex/core').then(m => console.log('Core loaded:', Object.keys(m)))"
```

Expected: All commands succeed

## Monitoring

### Package Downloads

Monitor npm download statistics:
- https://www.npmjs.com/package/@archlex/core
- https://www.npmjs.com/package/@archlex/cli

### Site Traffic

Monitor Cloudflare Pages analytics:
- Dashboard > Workers & Pages > [Project] > Analytics

### Issues

Monitor GitHub issues for:
- Bug reports
- Installation problems
- Feature requests

## Version Strategy

ArchLex follows semantic versioning:

- **0.x.y**: Pre-1.0 releases (current)
  - Breaking changes are allowed
  - Minor version for features
  - Patch version for fixes

- **1.x.y**: Stable releases (future)
  - Major version for breaking changes
  - Minor version for features
  - Patch version for fixes

## Release Checklist

Before each release:

- [ ] All tests pass
- [ ] Build succeeds for all packages
- [ ] Typecheck passes
- [ ] Package artifacts verified
- [ ] Static sites build successfully
- [ ] Changeset created and describes changes
- [ ] Documentation updated (if needed)
- [ ] Breaking changes documented (if any)

After each release:

- [ ] Verify all packages published to npm
- [ ] Verify all sites deployed to Cloudflare Pages
- [ ] Run `pnpm verify:sites`
- [ ] Run deployed playground smoke test
- [ ] Test clean install in fresh environment
- [ ] Monitor for issues

## Support

For release issues:
- **npm publishing:** Check [npm documentation](https://docs.npmjs.com/)
- **Cloudflare Pages:** Check [Cloudflare Pages docs](https://developers.cloudflare.com/pages/)
- **General:** Open an issue in the ArchLex repository
