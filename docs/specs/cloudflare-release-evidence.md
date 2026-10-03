---
title: Cloudflare Release Acceptance Evidence
description: "Local CF25 acceptance audit, verified capabilities, and release blockers."
lastModified: 2026-10-03T13:00:00-03:00
---

# Cloudflare release acceptance evidence

Audit date: 2026-10-03 (America/Sao_Paulo). Branch: `codex/cloudflare-pack`.
Implementation audited through `86fbf8d`. Task: [CF25 #92](https://github.com/baires/archlex/issues/92).

## Verdict

**Release acceptance is blocked.** The Cloudflare implementation and package
checks pass, but the complete browser suite does not. This document records an
executed audit, not release approval. No publishing, deployment, versioning,
merge, or push was performed.

## Executed checks

| Check | Result |
| --- | --- |
| `pnpm check` | Pass: 50 build/typecheck/test tasks, followed by repository lint |
| `pnpm exec vitest run` | Final run: 249 files, 2,170 tests pass |
| `pnpm validate:catalog` | Pass: 533 services, including all 92 Cloudflare resources; zero errors |
| `pnpm --filter @archlex/cloudflare icons:check` | Pass: all 92 resource mappings and revision-pinned artwork |
| `pnpm test:browser` | **Fail: 37 failed, 36 passed**; all 10 Cloudflare checks pass |
| `pnpm generate-docs` | Pass |
| `pnpm build:docs` | Pass; direct `pnpm --filter @archlex/docs build` also produced a fresh export |
| `pnpm verify:sites` | Pass: all three sites |
| `pnpm --filter @archlex/mcp-server build` | Pass: fresh embedded docs and Worker dry-run bundle |
| Provider build, package pack, and `scripts/audit-package.mjs` | Pass: 18 packed files, 92 attributed icons, resolved exports and notices |

The initial additional root Vitest run had 2,169 passes and one parser timing
failure: repeated malicious `-[` input took 29.11 ms against a 28.53 ms ratio
threshold while other checks ran concurrently. A complete rerun after the other
builds finished passed all 2,170 tests without changes to code or assertions.
This records timing sensitivity; it does not establish a parser regression.

## Inventory and implementation evidence

The user replaced resource child issues with [catalog completion #99](https://github.com/baires/archlex/issues/99).
The catalog implementation culminates in `b118a09`; the executable included-ID
contract, icon drift checker, catalog validator and packed export agree on all
92 IDs. No excluded navigation or company-logo asset is included in the package.

The only approved rule implementation is
[containment #100](https://github.com/baires/archlex/issues/100), committed in
`6a128bc`; registry alignment is `ef4e1e6`. Tests cover normal warnings, strict
errors and off mode, permitted root/account/group placement, native ancestor
scopes, and foreign/unknown resources. No runtime connectivity, policy or health
validation is claimed.

Standalone and public AWS fixtures were verified in `ddc0e5f`; Tunnel and
AWS/GCP steering fixtures in `830a92e`. Browser artwork/accessibility/export
coverage is `0f5b566`; Node/browser boundaries are `092a2d1`. All four fixtures
are also available in the playground picker (`87433b3`).

Provider documentation is `c897eea`; onboarding/reference changes are
`14110db` and `d0036ea`; MCP authoring and protocol expectations are `11893fc`
and `915863e`. The full pipeline includes all 303 MCP tests. The documentation
tests verify exact embedded public guide text and executable JSON examples.

Distribution audit `86fbf8d` checks the actual npm tarball: separate MIT
software and CC BY 4.0 artwork licenses, attribution notice, per-icon source
revision and adaptation labels, ESM/type exports and rewritten workspace
versions. Raw SVG inputs remain in the repository; sanitized fragments ship
inside the ESM bundle. Test declarations and build metadata are excluded.
Existing changesets cover Cloudflare, core registration and CLI contracts;
changeset status plans a Cloudflare minor release to 0.1.0. Current package
version remains 0.0.0 until the normal versioning step.

The recorded [CF01 distribution basis](/guides/cloudflare-artwork) is the
project owner's CC BY 4.0 repository-content decision with retained attribution
and non-endorsement notices. It does not grant trademark rights. This audit
confirms implementation against that recorded basis, not new legal clearance.

GitHub issues remain open because the local implementation commits have not
been pushed or merged. Their open state is not evidence that the code is
missing; it also must not be reported as remote tracker closure.

## Remaining release gate

[Browser regression issue #102](https://github.com/baires/archlex/issues/102)
remains open. The current failures are:

| Existing suite | Failures |
| --- | ---: |
| `visual-acceptance.spec.mjs` | 22 |
| `playground-workspace.spec.mjs` | 9 |
| `phase-one.spec.mjs` | 4 |
| `deployed-playground.spec.mjs` | 2 |

The same 37 failures were recorded during CF20; the additional passing test is
the four-example picker check. Failures include Darwin visual snapshot
differences, workspace geometry/control/diagnostic expectations, and deployed
site editor behavior. The deployed tests default to the public playground,
so their result is not solely a test of this local branch. They must be
classified and repaired in bounded follow-ups; snapshots must be reviewed
before updating them. This audit did not skip tests or regenerate baselines.

After #102 is resolved, rerun the complete acceptance commands on the intended
release revision and present the updated evidence for a publishing decision.
The all-checks-pass criterion of CF25 remains unsatisfied until that rerun.

## Local artifacts

Command logs are under `/tmp/archlex-cf25/` (`check.log`, `root-tests.log`,
`root-tests-retry.log`, `browser.log`, `catalog.log`, `icons.log`, `generate.log`,
`docs.log`, `docs-fresh.log`, `sites.log`, `mcp-fresh.log`, `package-audit.log`).
Browser artifacts are in ignored `test-results/`. The packed tarball is
`/tmp/archlex-cloudflare-pack-review/archlex-cloudflare-0.0.0.tgz`.
These temporary artifacts are local evidence and are not release deliverables.
