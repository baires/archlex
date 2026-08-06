# Cloudflare Pages Deployment Guide

This guide covers deploying ArchLex's three static sites (landing, playground, docs) to Cloudflare Pages.

## Overview

ArchLex uses Cloudflare Pages to deploy three independent static sites:

- **Landing** (`archlex.dev`) - Marketing site built with Astro
- **Playground** (`playground.archlex.dev`) - Interactive diagram editor built with React + Vite
- **Docs** (`docs.archlex.dev`) - Documentation site built with Next.js + Nextra

Each site:
- Builds from the monorepo using pnpm and Turbo
- Has its own Cloudflare Pages project
- Gets preview deployments for pull requests
- Deploys to production from the `main` branch

## Prerequisites

1. **Cloudflare account** with Pages enabled
2. **GitHub integration** configured in Cloudflare
3. **Custom domains** configured in Cloudflare DNS:
   - `archlex.dev`
   - `playground.archlex.dev`
   - `docs.archlex.dev`

## Project Configuration

### Landing Site

**Cloudflare Pages Project Name:** `archlex-landing`

**Build Configuration:**
- **Framework preset:** None
- **Build command:** `pnpm install --frozen-lockfile && pnpm build:landing`
- **Build output directory:** `apps/landing/dist`
- **Root directory:** (leave blank - monorepo root)
- **Node version:** 22
- **Environment variables:** None required

**Watch paths:**
```
apps/landing/**
packages/design/**
```

**Custom domain:** `archlex.dev`

### Playground Site

**Cloudflare Pages Project Name:** `archlex-playground`

**Build Configuration:**
- **Framework preset:** None
- **Build command:** `pnpm install --frozen-lockfile && pnpm build:playground`
- **Build output directory:** `apps/playground/dist`
- **Root directory:** (leave blank - monorepo root)
- **Node version:** 22
- **Environment variables:** None required

**Watch paths:**
```
apps/playground/**
packages/core/**
packages/aws/**
packages/gcp/**
packages/model/**
packages/parser/**
packages/diagnostics/**
packages/renderer-svg/**
packages/layout-elk/**
packages/icons-core/**
packages/icons-browser/**
packages/design/**
```

**Custom domain:** `playground.archlex.dev`

### Docs Site

**Cloudflare Pages Project Name:** `archlex-docs`

**Build Configuration:**
- **Framework preset:** None
- **Build command:** `pnpm install --frozen-lockfile && pnpm build:docs`
- **Build output directory:** `apps/docs/out`
- **Root directory:** (leave blank - monorepo root)
- **Node version:** 22
- **Environment variables:**
  - `NODE_OPTIONS=--max-old-space-size=4096` (if build memory issues occur)

**Watch paths:**
```
apps/docs/**
packages/design/**
```

**Custom domain:** `docs.archlex.dev`

## Setup Instructions

### 1. Create Cloudflare Pages Projects

For each site, create a new Pages project:

1. Log into Cloudflare Dashboard
2. Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
3. Select the `cloud-mer` GitHub repository
4. Configure the project using settings above
5. Click **Save and Deploy**

### 2. Configure Custom Domains

For each project:

1. Go to project settings > **Custom domains**
2. Add the custom domain listed above
3. Cloudflare will automatically handle DNS and SSL certificates

### 3. Configure Build Watch Paths

Cloudflare Pages doesn't directly support watch paths, but you can:

1. Use GitHub Actions to trigger deployments (optional)
2. Rely on Cloudflare's automatic detection
3. Manual deployments when needed

### 4. Configure Branch Deployments

In each project's settings:

- **Production branch:** `main`
- **Preview deployments:** All branches
- **Pull request comments:** Enabled

## Build Commands Explained

### Why pnpm install --frozen-lockfile?

- Uses exact versions from `pnpm-lock.yaml`
- Prevents dependency drift
- Faster installs (no resolution)

### Why build:landing/playground/docs?

These are Turbo-optimized scripts that:
- Only build the target app and its dependencies
- Use Turbo's caching when available
- Avoid building unnecessary packages

## Verification

After deploying, verify each site:

```bash
# Automated verification
pnpm verify:sites

# Or manually
curl -I https://archlex.dev
curl -I https://playground.archlex.dev
curl -I https://docs.archlex.dev
```

Expected: `200 OK` with `content-type: text/html`

### Smoke Test the Playground

Run the Playwright smoke test:

```bash
# Test production
PLAYGROUND_URL=https://playground.archlex.dev pnpm test:browser tests/browser/deployed-playground.spec.mjs

# Test preview deployment
PLAYGROUND_URL=https://abc123.archlex-playground.pages.dev pnpm test:browser tests/browser/deployed-playground.spec.mjs
```

## Preview Deployments

Every pull request gets preview URLs:

- Landing: `https://[pr-id].archlex-landing.pages.dev`
- Playground: `https://[pr-id].archlex-playground.pages.dev`
- Docs: `https://[pr-id].archlex-docs.pages.dev`

These are automatically commented on the PR by Cloudflare.

## Troubleshooting

### Build fails with "module not found"

- Check that `pnpm install --frozen-lockfile` is in the build command
- Verify Node.js version is 22

### Build succeeds but site shows 404

- Check the **Build output directory** matches the project's output
- Landing: `apps/landing/dist`
- Playground: `apps/playground/dist`
- Docs: `apps/docs/out`

### Custom domain not working

- Verify DNS records in Cloudflare DNS
- Wait 5-10 minutes for propagation
- Check SSL certificate is active

### Build times out

- Increase memory with `NODE_OPTIONS=--max-old-space-size=4096`
- Contact Cloudflare support to increase timeout limits

### Changes not triggering deployments

- Ensure the changed files are in the project's watch paths
- Check GitHub integration is working
- Try a manual deployment from Cloudflare dashboard

## Manual Deployment

To manually deploy from the Cloudflare dashboard:

1. Go to the project
2. Click **Create deployment**
3. Select branch
4. Click **Deploy**

## Local Preview of Production Build

Test the production build locally:

```bash
# Build and preview landing
pnpm build:landing && cd apps/landing && pnpm preview

# Build and preview playground
pnpm build:playground && cd apps/playground && pnpm preview

# Build and preview docs
pnpm build:docs && cd apps/docs && pnpm preview
```

## Deployment Logs

View deployment logs in:

1. Cloudflare Dashboard > Pages > [Project] > View build
2. Look for errors in the build output
3. Check the deployment status and URL

## Rollback

To rollback a deployment:

1. Go to Cloudflare Dashboard > Pages > [Project]
2. Find the previous successful deployment
3. Click **Rollback to this deployment**

## Environment Variables

If you need to add environment variables:

1. Go to project settings > **Environment variables**
2. Add variables for **Production** and/or **Preview**
3. Redeploy for changes to take effect

**Note:** Environment variables are build-time only (no runtime secrets in static sites).

## Best Practices

1. **Test locally first** - Always build and preview locally before pushing
2. **Use preview deployments** - Test changes in preview URLs before merging
3. **Monitor builds** - Check build logs if something breaks
4. **Keep dependencies updated** - Regular updates prevent build issues
5. **Verify after deploy** - Run `pnpm verify:sites` after production deploys

## Cost

Cloudflare Pages offers:
- **Free tier:** 500 builds/month, unlimited requests
- **Pro tier:** 5,000 builds/month, advanced features

ArchLex typically uses well within the free tier limits.

## Support

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Community](https://community.cloudflare.com/)
- Open an issue in the ArchLex repository for project-specific help
