# ArchLex landing

Static Astro marketing site for LLM-ready multicloud diagrams, a free hosted MCP server and a human editing playground. The hero uses a real source spanning Cloudflare, AWS, GCP and Kubernetes, rendered by core at build time. MCP setup is the default onboarding path; the skill, playground and SDK are available through compact underline tabs.

The supporting “Architecture under review” example is compiled by @archlex/core at build time. Both the supported writes relationship and the unsupported invokes target use real AWS provider diagnostics and rendered SVG. Light/dark and desktop/mobile variants are precompiled; ELK and the compiler are never shipped to visitors.

The browser state in src/scripts/review-bench.ts keeps the drawing, highlighted endpoints, source, diagnostic and playground link synchronized. Playground links use the existing code query parameter and preserve the selected example. No hosted service or API key is needed to use this bounded demo.

src/data/site.ts owns copy, example source, provider coverage and setup paths. @archlex/design owns fonts, palette, spacing, radii, focus, motion and scrollbar tokens. See the root DESIGN.md for the design rationale.

## Development and verification

From the repository root:
- pnpm dev:landing starts Astro.
- pnpm build:landing builds workspace dependencies and static pages.
- pnpm --filter @archlex/landing preview --host 127.0.0.1 --port 4400 previews the production build.
- pnpm exec playwright test --config playwright.landing.config.mjs verifies the demo, responsive layouts, setup paths, clipboard recovery, theme selection, reduced motion and no-JavaScript fallback.
- pnpm vitest run --exclude '.worktrees/**' apps/landing/landing-assets.test.ts checks static discovery assets.
- pnpm generate-docs, pnpm build:docs and pnpm verify:sites validate shared documentation and URLs.

The home, AWS reference and 404 routes use the same shared layout. The default example and install command remain readable without JavaScript; links to the playground and documentation provide the full workflows. Deployment continues to use the existing static hosting configuration.

The hero prompt and setup commands share src/scripts/clipboard.ts for accessible success and fallback selection. The Open Graph image at public/og-multicloud.png is captured from the actual multicloud hero rather than an AWS-only example.

The Free MCP panel includes a client-aware setup prompt in src/data/site.ts. Visitors can copy it directly or expand it to read the full instructions. Clipboard failure opens and selects the prompt for manual copying.
