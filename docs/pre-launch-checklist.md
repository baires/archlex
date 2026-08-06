# Pre-Launch Checklist

Before publishing ArchLex packages to npm for the first time, complete this checklist.

## Prerequisites

### npm Setup
- [ ] Create npm account at https://www.npmjs.com
- [ ] Verify email address
- [ ] Enable 2FA (two-factor authentication)
- [ ] Create @archlex organization on npm
  - Go to https://www.npmjs.com/org/create
  - Name: `archlex`
  - Make it public
- [ ] Generate npm automation token
  - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
  - Click "Generate New Token" > "Automation"
  - Copy the token (starts with `npm_`)

### GitHub Setup
- [ ] Add NPM_TOKEN secret to GitHub repository
  - Go to Settings > Secrets and variables > Actions
  - Click "New repository secret"
  - Name: `NPM_TOKEN`
  - Value: paste your npm token
- [ ] Verify GitHub Actions are enabled
- [ ] Check that main branch is protected (optional but recommended)

### Repository Setup
- [ ] All packages build successfully: `pnpm build`
- [ ] All tests pass: `pnpm test`
- [ ] Typecheck passes: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Review all package.json files
- [ ] Review all README.md files
- [ ] Verify LICENSE files in all packages
- [ ] Check changeset status: `pnpm changeset status`

## Pre-Launch Testing

### Local Build Test
```bash
# Clean build
rm -rf packages/*/dist
pnpm build

# Verify dist directories exist
ls packages/*/dist
```

### Package Testing
```bash
# Pack each main package
cd packages/core && npm pack && cd ../..
cd packages/cli && npm pack && cd ../..

# Test in a fresh directory
mkdir /tmp/test-archlex
cd /tmp/test-archlex
npm init -y
npm install /path/to/cloud-mer/packages/core/archlex-core-0.1.0.tgz

# Test the CLI
npm install -g /path/to/cloud-mer/packages/cli/archlex-cli-0.1.0.tgz
archlex --help
```

### Dry Run
```bash
# Dry-run publish (doesn't actually publish)
pnpm changeset publish --dry-run

# Review what would be published
```

## Launch Day

### 1. Final Review
- [ ] Review the initial changeset: `.changeset/initial-release.md`
- [ ] Confirm all packages are at version 0.1.0
- [ ] Check that no sensitive data is in dist/ or package files

### 2. Commit and Push
```bash
git add .
git commit -m "chore: prepare packages for npm publishing"
git push origin main
```

### 3. Monitor GitHub Actions
- [ ] Go to Actions tab in GitHub
- [ ] Watch the Release workflow
- [ ] Wait for "Version Packages" PR to be created

### 4. Review Version PR
- [ ] Check package.json version bumps
- [ ] Review CHANGELOG.md files
- [ ] Verify changeset was consumed
- [ ] Approve and merge the PR

### 5. Monitor Publishing
- [ ] Watch the Release workflow run after merge
- [ ] Check for any errors
- [ ] Wait for completion

### 6. Verify Published Packages
```bash
# Check each package on npm
npm view @archlex/core
npm view @archlex/aws
npm view @archlex/gcp
npm view @archlex/cli
npm view @archlex/model
npm view @archlex/parser
npm view @archlex/diagnostics
npm view @archlex/renderer-svg
npm view @archlex/layout-elk
npm view @archlex/icons-core
npm view @archlex/icons

# Check provenance
npm view @archlex/core --json | jq .dist.attestations
```

### 7. Test Installation
```bash
# Test global CLI installation
npm install -g @archlex/cli
archlex --version

# Test package installation
mkdir test-project
cd test-project
npm init -y
npm install @archlex/core @archlex/aws

# Test imports
node -e "import('@archlex/core').then(m => console.log('Core loaded:', Object.keys(m)))"
```

## Post-Launch

### Documentation
- [ ] Update landing page (apps/landing) with npm installation instructions
- [ ] Update docs site with "Getting Started" guide
- [ ] Add npm badges to README files
- [ ] Update CLAUDE.md if needed

### Announcement
- [ ] Tweet about the release
- [ ] Post on Reddit (r/programming, r/devops)
- [ ] Post on Hacker News
- [ ] Write a blog post on Dev.to
- [ ] Update personal website/portfolio

### Monitoring
- [ ] Monitor npm download stats
- [ ] Watch for GitHub issues
- [ ] Monitor package security alerts
- [ ] Set up npm package monitoring (optional)

## Rollback Plan (If Needed)

If something goes wrong:

1. **Within 72 hours**: Unpublish
   ```bash
   npm unpublish @archlex/core@0.1.0
   ```

2. **After 72 hours**: Deprecate and publish fix
   ```bash
   npm deprecate @archlex/core@0.1.0 "Critical issue, use 0.1.1"
   # Create fix changeset
   pnpm changeset
   # Publish new version
   ```

3. **Critical security issue**: 
   - Contact npm support immediately
   - Publish patched version ASAP
   - Notify users via GitHub advisory

## Success Metrics

After 24 hours:
- [ ] All packages visible on npm
- [ ] Downloads > 0 for at least one package
- [ ] No critical issues reported
- [ ] CLI installation works
- [ ] Basic examples work

After 1 week:
- [ ] Downloads > 100 total
- [ ] At least one external user reported success
- [ ] Documentation feedback received

## Notes

- npm CDN can take 5-15 minutes to propagate globally
- Package searches may take longer to update
- Don't panic if packages aren't immediately visible
- Check https://status.npmjs.org/ if there are issues

## Contacts

- npm Support: https://www.npmjs.com/support
- GitHub Actions Support: https://github.com/contact
- Changesets Issues: https://github.com/changesets/changesets/issues

---

**Ready to launch?** Start from the top and check off each item!
