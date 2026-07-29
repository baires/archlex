# Final whole-branch fix report

Date: 2026-07-29

Branch: `codex/mermaid-aws-renderer`

Finding source: `final-review-findings.md`

Reviewed starting head: `4d73b3f`

## Outcome

All Critical and Important findings were reproduced with focused RED tests and
fixed. All four low-risk Minor findings were also fixed. The resulting branch
passes importer reproducibility, the full monorepo check, all browser tests,
focused XML/mount regressions, Biome, and the clean-worktree audit.

## Finding disposition

| Severity | Finding | Resolution | Regression evidence |
| --- | --- | --- | --- |
| Critical | Prefixed/foreign SVG content bypassed regex-only import and mount checks | Replaced build-time regex checks with namespace-aware XML parsing, strict element/attribute allowlists, canonical serialization, DOCTYPE/entity/processing-instruction rejection, foreign namespace and `xml:base` rejection, fragment-only IRI checks, duplicate/unresolved ID checks, and an independent browser DOM walk before import/append. | Importer and mount unit regressions plus a real Chromium prefixed XHTML iframe execution regression. |
| Important | Edge IDs containing arrow syntax produced malformed XML | Internal edge IDs now use deterministic UTF-8 hex encoding while the escaped original remains in `data-cloudmer-id` and element mappings. | Every supported arrow round-trips through serialization and `mountSvg`. |
| Important | Repeated provider icons reused local IDs | Every provider-local ID is namespaced per node; `url(#...)`, `href`/`xlink:href`, and ARIA IDREFs are rewritten to the namespaced targets. | Unit reference checks and a two-instance browser mount regression. |
| Important | Two-line labels overlapped icons in 128×92 cards | Introduced fixed icon geometry and distinct single-/multi-line label insets; two-line baselines now remain below the 48px icon and within the card. | Chromium bounding-box regression on an actual 128×92 card. |
| Important | An overlong first token could overflow | The shared label helper deterministically ellipsizes overlong first tokens while the node retains its complete `aria-label`. | Helper and serialized accessible-name regressions. |
| Important | Edge diagnostics selected an array vertex rather than the route midpoint | Diagnostic placement now walks cumulative polyline length and interpolates at half the total distance, with explicit empty, one-point, and zero-length behavior. | Two-point and unequal-segment polyline tests. |
| Important | New required theme tokens broke the exported source shape | `textMuted` and `edgeHoverStroke` are optional publicly; rendering falls back to `scopeTextFill` and `edgeStroke`. | Previous-shape `satisfies ThemeTokens` compile fixture and renderer typecheck. |
| Important | Browser acceptance rejected inert provider gradients/filters | Browser policy now checks only root CloudMer-owned definitions for gradients/filters while still rejecting active animation, legacy glass/pill identifiers, and unsafe references globally. | A nested provider gradient/filter browser fixture passes; all real semantic cases retain the negative checks. |
| Minor | Manifest checksum was a colon-joined string | Code generation now emits a 64-hex SHA-256 over canonical `JSON.stringify` output for sorted `[key, checksum]` tuples; browser runtime imports the generated digest without `node:crypto`. | Independent digest computation and format assertions. |
| Minor | `viewBox` geometry and import error context were weak | Import now requires exactly four finite numbers and positive width/height, and generation errors include both service key and source path. | Invalid-geometry table and missing-file context regression. |
| Minor | Only Darwin visual baselines were tracked without an execution policy | Visual snapshots now have an explicit, tested Darwin-only policy; semantic browser tests remain cross-platform. | Platform-policy unit test covers Darwin, Linux, and Windows. |
| Minor | Neutral topology boundaries were below 3:1 | Light node/scope strokes use `#84909f`; dark node/scope strokes use `#64748b`. | WCAG relative-luminance tests require at least 3:1 for every node/scope fill pair. |

## TDD evidence

The focused RED observations were captured before each implementation:

- SVG boundary tests: 7 failures and 20 passes; the Chromium exploit fixture
  reported no safety error, script execution as `true`, and one appended child.
- Safe IDs: the serializer reference test failed, and two browser cases failed
  with malformed arrow XML and duplicate provider ID `paint`.
- Compact card geometry: Chromium measured icon bottom `1308.1028` above label
  top `1285.9397`, violating the non-overlap assertion.
- Labels: 3 failures and 13 passes; overlong first tokens remained intact and
  the serialized visible label lacked an ellipsis.
- Route midpoint: 2 failures and 10 passes; markers landed on endpoints/vertices.
- Theme source compatibility: renderer typecheck exited 2 with TS1360 because
  the legacy object omitted `textMuted` and `edgeHoverStroke`.
- Boundary contrast: 3 failures and 2 passes; failing ratios were 2.0250,
  2.3239, and 2.3213.
- Provider effects: the browser fixture found 2 provider effects where the old
  global policy required 0.
- Snapshot platform policy: the focused test failed because no explicit policy
  module existed.
- AWS manifest/viewBox/error context: 10 intended focused failures before the
  generator and runtime changes.

Focused GREEN evidence after implementation:

- Hardened importer/mount and ID slice: `pnpm check` passed 20/20 tasks and the
  then-current Playwright suite passed 15/15.
- AWS generation slice: 42/42 focused tests, importer freshness, package build,
  package typecheck, Biome, and diff check passed.
- Renderer label/midpoint/theme/contrast slice: 23/23 renderer tests, renderer
  build/typecheck, Biome, and diff check passed.
- Browser policy: phase-one 5/5 and platform policy 1/1 passed.
- Compact card and mount boundary suite: 4/4 browser tests plus 12/12 serializer
  tests passed.

## Visual baseline review

Eight candidate screenshots were rendered to a separate temporary directory
before any tracked baseline was changed. Every candidate and every subsequently
updated tracked PNG was inspected at original resolution. Review confirmed:

- official AWS artwork remains crisp and undistorted;
- two-line labels clear both the icon and card bottom;
- arrows meet resource boundaries;
- account → region → VPC → subnet hierarchy remains readable;
- desktop and narrow layouts remain centered without clipping; and
- stronger neutral boundaries are legible without dominating either theme.

After inspection, all eight Darwin baselines were regenerated. A fresh run
without snapshot updates passed 8/8.

## Final verification

Fresh commands run from a clean implementation head:

```text
pnpm --filter @cloudmer/aws icons:check
  PASS

pnpm check
  20/20 Turbo tasks successful
  Biome: 91 files checked, no fixes

pnpm exec playwright test
  17/17 passed

pnpm vitest run packages/aws/src/icons/importer.test.ts \
  tests/mount-safety.test.ts \
  packages/renderer-svg/src/serializer/index.test.ts \
  packages/renderer-svg/src/serializer/labels.test.ts \
  packages/renderer-svg/src/theme/index.test.ts \
  tests/visual-snapshot-policy.test.ts
  59/59 passed

git diff --check
  PASS

test -z "$(git status --porcelain)"
  PASS
```

## Fix commits

- `3f7bf7a` — `fix(security): harden SVG import and mounting`
- `655382a` — `test(browser): align visual acceptance policies`
- `829c534` — `fix(aws): validate generated icon manifests`
- `8a43b23` — `fix(renderer): resolve final rendering regressions`
- `3e6f60a` — `fix(renderer): separate compact card labels`
- `d76005f` — `test(browser): refresh reviewed visual baselines`

## Residual concerns

No requested correctness or security finding remains open. Visual baselines are
intentionally Darwin-only and other platforms run semantic browser coverage.
The existing Vite advisory about the playground bundle exceeding 500 kB remains
non-failing and outside this renderer/importer review.
