---
title: Cloudflare Release Acceptance Evidence
description: "CF25 acceptance audit for the shipped Cloudflare provider: verified capabilities and retained historical evidence."
lastModified: 2026-10-03T13:00:00-03:00
---

# Cloudflare release acceptance evidence

Audit date: 2026-10-03 (America/Sao_Paulo). Branch: `codex/cloudflare-pack`.
Initial audit revision: `86fbf8d`. Task: [CF25 #92](https://github.com/baires/archlex/issues/92).

## Current verdict after browser remediation

**Local release acceptance checks pass after [#102](https://github.com/baires/archlex/issues/102) remediation.**
Remediation revision: `42f2f36`. The full browser suite now passes all 74 tests without snapshot-update mode,
including all 10 Cloudflare checks. The local pipeline passes all 50 tasks and
repository lint; the root suite passes 2,173 tests across 249 files. Catalog,
92-resource artwork checks and the 18-file package audit also pass. The completed audit results below are retained as historical
evidence. Publishing, pushing and merging still require their normal workflow;
this report does not perform or authorize them.

The fixes restore SVG node clicks and delayed fullscreen focus, cancel
uncaptured gestures released outside the preview, preserve typed completion
prefixes at lexer token boundaries, and align tests with Monaco, bundled
artwork, the maintained workspace design and explicit endpoint targets.
Twenty-two Darwin baselines were reviewed against their originals before
refreshing them in bounded commits; screenshot thresholds were retained.
Three endpoint smoke checks pass both locally and against the explicitly
selected public playground. Default browser acceptance now tests the local app.

## Initial CF25 verdict

**Release acceptance was blocked at the initial audit.** The Cloudflare implementation and package
checks pass, but the complete browser suite does not. This document records an
executed audit, not release approval. No publishing, deployment, versioning,
merge, or push was performed.

## Initial executed checks

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

## Initial release gate (resolved by #102)

[Browser regression issue #102](https://github.com/baires/archlex/issues/102)
recorded the initial failures:

| Existing suite | Failures |
| --- | ---: |
| `visual-acceptance.spec.mjs` | 22 |
| `playground-workspace.spec.mjs` | 9 |
| `phase-one.spec.mjs` | 4 |
| `deployed-playground.spec.mjs` | 2 |

The same 37 failures were recorded during CF20; the additional passing test is
the four-example picker check. Failures include Darwin visual snapshot
differences, workspace geometry/control/diagnostic expectations, and deployed
site editor behavior. The deployed tests initially defaulted to the public playground, so those
results were not solely tests of the local branch. Classification, bounded
repairs and visual review were required. The initial audit did not skip tests
or regenerate baselines.

After #102 is resolved, rerun the complete acceptance commands on the intended
release revision and present the updated evidence for a publishing decision.
The complete acceptance commands were rerun after remediation; the browser
all-checks-pass criterion is now satisfied. No deployment or publishing occurred.

## Local artifacts

Command logs are under `/tmp/archlex-cf25/` (`check.log`, `root-tests.log`,
`root-tests-retry.log`, `browser.log`, `catalog.log`, `icons.log`, `generate.log`,
`docs.log`, `docs-fresh.log`, `sites.log`, `mcp-fresh.log`, `package-audit.log`).
Browser artifacts are in ignored `test-results/`. The packed tarball is
`/tmp/archlex-cloudflare-pack-review/archlex-cloudflare-0.0.0.tgz`.
These temporary artifacts are local evidence and are not release deliverables.

## Remediation evidence

Current command logs are under `/tmp/archlex-102/`: `browser-final-2.log`
(74 passes), `check-final.log` (50 successful tasks and lint), `root-final.log`,
`acceptance-docs.log`, `evidence-docs.log`, `evidence-mcp.log`,
`catalog-final.log`, `icons-final.log`, and
`package-final.log`. The original/current visual comparisons are
`review-1.png` through `review-6.png`. These are temporary local artifacts.

Supporting issues #106–#117 retain the bounded scopes, root causes and evidence.
GitHub issue closure still follows integration of the local commits.
