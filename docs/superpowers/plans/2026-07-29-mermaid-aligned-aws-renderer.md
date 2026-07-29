# Mermaid-Aligned AWS Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render compact Mermaid-aligned architecture diagrams using official AWS artwork for RDS, RDS Proxy, and ECS, backed by a repeatable safe icon importer.

**Architecture:** Vendor only the three official SVG source files, generate deterministic sanitized TypeScript icon data through a Node importer, and keep runtime rendering synchronous and self-contained. Simplify the SVG serializer and theme tokens around neutral cards, inline scope labels, compact markers, deterministic two-line labels, and non-glowing diagnostics while retaining ELK orthogonal geometry.

**Tech Stack:** TypeScript 5.7, Node.js 22 ESM, Vite 6, Vitest 3, ELK, SVG, Playwright 1.62, pnpm/turbo.

## Global Constraints

- Diagram syntax, public service keys, and renderer entry points remain stable.
- Runtime rendering performs no network requests and emits no external SVG references.
- Official AWS paths, geometry, and colors are preserved and never recolored or placed in synthetic badges.
- SVG output is deterministic, standalone, keyboard accessible, and free of scripts, event handlers, imports, `foreignObject`, external URLs, and active animation.
- Labels occupy no more than two deterministic lines; the complete label remains in `aria-label`.
- Error and warning states combine color with a stroke pattern and compact status marker.
- This pass includes only `aws.rds`, `aws.rds-proxy`, and `aws.ecs`; unknown resources retain the generic fallback.
- Existing uncommitted renderer and test edits belong to the user. Preserve compatible rounded routing and replace only the glassmorphism behavior covered by the approved spec.
- Do not stage `.superpowers/` or unrelated files under the existing untracked `docs/plans/` directory.

---

## File Structure

- `packages/aws/assets/official/*.svg`: immutable official AWS source artwork for the three supported icons.
- `packages/aws/scripts/import-official-icons.mjs`: deterministic importer, validator, sanitizer, checksum generator, and CLI entry point.
- `packages/aws/src/icons/generated.ts`: generated runtime icon fragments and checksums; never hand-edit.
- `packages/aws/src/icons/index.ts`: stable public/provenance mapping from CloudMer icon keys to generated fragments.
- `packages/aws/src/icons/importer.test.ts`: importer safety, fidelity, determinism, and failure tests.
- `packages/aws/src/icons/manifest.ts`: catalog manifest consuming generated official icon records.
- `packages/aws/src/catalog/index.test.ts`, `tests/aws-catalog.test.ts`: runtime resolution and official-art fidelity assertions.
- `packages/renderer-svg/src/serializer/labels.ts`: deterministic one/two-line label layout helper.
- `packages/renderer-svg/src/serializer/labels.test.ts`: focused label layout tests.
- `packages/renderer-svg/src/serializer/index.ts`: neutral nodes/scopes, official icon placement, markers, diagnostics, and serialization.
- `packages/renderer-svg/src/serializer/index.test.ts`, `tests/renderer-production.test.ts`: renderer behavior, safety, determinism, and regression coverage.
- `packages/renderer-svg/src/theme/index.ts`: reduced neutral theme tokens for light/dark parity.
- `tests/browser/phase-one.spec.mjs`: acceptance scenarios, layout geometry, and theme coverage.
- `tests/browser/visual-acceptance.spec.mjs`: screenshot assertions for desktop and narrow preview widths.

---

### Task 1: Deterministic official-icon importer

**Files:**
- Move: `packages/aws/src/icons/rds.svg` → `packages/aws/assets/official/rds.svg`
- Move: `packages/aws/src/icons/rds-proxy.svg` → `packages/aws/assets/official/rds-proxy.svg`
- Move: `packages/aws/src/icons/ecs.svg` → `packages/aws/assets/official/ecs.svg`
- Create: `packages/aws/scripts/import-official-icons.mjs`
- Create: `packages/aws/src/icons/importer.test.ts`
- Modify: `packages/aws/package.json`

**Interfaces:**
- Produces: `sanitizeAwsSvg(svg: string, sourceName: string): { viewBox: string; svg: string }`.
- Produces: `generateIconModule(entries: readonly { key: string; sourcePath: string }[]): Promise<string>`.
- Produces CLI: `node scripts/import-official-icons.mjs --check` validates that generated output is current; no flag rewrites `src/icons/generated.ts`.

- [ ] **Step 1: Write failing importer contract tests**

Create table-driven Vitest cases that import the script module and assert:

```ts
expect(sanitizeAwsSvg('<svg viewBox="0 0 64 64"><path fill="#C925D1" d="M0 0h1"/></svg>', "rds.svg")).toEqual({
  viewBox: "0 0 64 64",
  svg: '<svg viewBox="0 0 64 64"><path fill="#C925D1" d="M0 0h1"/></svg>',
});
expect(() => sanitizeAwsSvg('<svg><script>alert(1)</script></svg>', "unsafe.svg")).toThrow(/unsafe\.svg.*script/i);
expect(() => sanitizeAwsSvg('<svg viewBox="0 0 1 1"><use href="https:\/\/example.com\/x.svg#x"/></svg>', "external.svg")).toThrow(/external\.svg.*external/i);
expect(() => sanitizeAwsSvg('<svg viewBox="0 0 1 1" onload="x()"/>', "event.svg")).toThrow(/event\.svg.*event/i);
expect(() => sanitizeAwsSvg('<svg><path/></svg>', "geometry.svg")).toThrow(/geometry\.svg.*viewBox/i);
```

Add a determinism test that calls `generateIconModule()` twice for the same explicit entries and expects byte equality and stable SHA-256 strings.

- [ ] **Step 2: Run the importer tests and verify RED**

Run: `pnpm vitest run packages/aws/src/icons/importer.test.ts`

Expected: FAIL because `packages/aws/scripts/import-official-icons.mjs` and its exports do not exist.

- [ ] **Step 3: Implement the minimal validator and generator**

Implement strict allow/deny validation before normalization:

```js
const FORBIDDEN = [
  [/<script\b/i, "script"],
  [/<foreignObject\b/i, "foreignObject"],
  [/<(?:animate|animateMotion|animateTransform|set)\b/i, "active animation"],
  [/\son[a-z]+\s*=/i, "event attribute"],
  [/(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:|javascript:)/i, "external reference"],
  [/@import|url\s*\(/i, "external style reference"],
];

export function sanitizeAwsSvg(svg, sourceName) {
  for (const [pattern, reason] of FORBIDDEN) {
    if (pattern.test(svg)) throw new Error(`${sourceName}: forbidden ${reason}`);
  }
  const viewBox = svg.match(/\bviewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`${sourceName}: missing viewBox`);
  const normalized = svg
    .replace(/<\?xml[^>]*>\s*/g, "")
    .replace(/<title>[\s\S]*?<\/title>\s*/g, "")
    .replace(/\s(?:width|height|version|xmlns:xlink)="[^"]*"/g, "")
    .replace(/>\s+</g, "><")
    .trim();
  return { viewBox, svg: normalized };
}
```

Generate a sorted `AWS_GENERATED_ICONS` record containing `key`, `viewBox`, `checksum`, and complete sanitized `<svg>` markup. Use `node:crypto` SHA-256 and JSON stringification for safe TypeScript literals. Use explicit entries for the three supported icons rather than directory glob order.

- [ ] **Step 4: Move the official source files and wire package scripts**

Use `apply_patch` for text moves or a non-destructive `mv` with exact paths. Add:

```json
"icons:generate": "node scripts/import-official-icons.mjs",
"icons:check": "node scripts/import-official-icons.mjs --check"
```

The importer resolves all paths from `import.meta.url`, so it works from any current directory.

- [ ] **Step 5: Run importer tests and generation to verify GREEN**

Run:

```bash
pnpm vitest run packages/aws/src/icons/importer.test.ts
pnpm --filter @cloudmer/aws icons:generate
pnpm --filter @cloudmer/aws icons:check
```

Expected: all tests PASS, generation creates `packages/aws/src/icons/generated.ts`, and `--check` exits 0 without rewriting it.

- [ ] **Step 6: Commit the importer unit**

```bash
git add packages/aws/assets/official packages/aws/scripts/import-official-icons.mjs packages/aws/src/icons/importer.test.ts packages/aws/src/icons/generated.ts packages/aws/package.json packages/aws/src/icons/rds.svg packages/aws/src/icons/rds-proxy.svg packages/aws/src/icons/ecs.svg
git commit -m "feat(aws): import official architecture icons"
```

---

### Task 2: Replace recreated runtime glyphs with generated official fragments

**Files:**
- Modify: `packages/aws/src/icons/index.ts`
- Modify: `packages/aws/src/icons/manifest.ts`
- Modify: `packages/aws/src/catalog/index.test.ts`
- Modify: `tests/aws-catalog.test.ts`
- Modify: `tests/aws-semantics.test.ts`

**Interfaces:**
- Consumes: `AWS_GENERATED_ICONS` from Task 1.
- Produces: unchanged `AWS_PHASE_ONE_ICONS: Readonly<Record<string, string>>` keys.
- Produces: manifest records whose `svgFragment` contains official sanitized SVG markup and whose checksum is copied from generated data.

- [ ] **Step 1: Add failing catalog fidelity tests**

Assert exact provider traits instead of implementation-shaped placeholder geometry:

```ts
expect(AWS_PHASE_ONE_ICONS["aws.rds"]).toContain("#C925D1");
expect(AWS_PHASE_ONE_ICONS["aws.ecs"]).toContain("#ED7100");
expect(AWS_PHASE_ONE_ICONS["aws.rds-proxy"]).toContain('viewBox="0 0 48 48"');
expect(AWS_PHASE_ONE_ICONS["aws.rds"]).not.toContain('<ellipse cx="32"');
expect(AWS_PHASE_ONE_ICONS["aws.ecs"]).not.toContain('<rect width="64" height="64" rx="8"');
```

Assert that all three manifest checksums match `/^[a-f0-9]{64}$/` and that serialized catalog output contains no `http:`, `https:`, `<script`, or event attribute.

- [ ] **Step 2: Run the focused catalog tests and verify RED**

Run: `pnpm vitest run packages/aws/src/catalog/index.test.ts tests/aws-catalog.test.ts tests/aws-semantics.test.ts`

Expected: FAIL because the manifest still exposes simplified handcrafted fragments and the icon index still imports raw files directly.

- [ ] **Step 3: Wire generated data into stable runtime APIs**

Replace `?raw` imports with:

```ts
import { AWS_GENERATED_ICONS } from "./generated.js";

export const AWS_PHASE_ONE_ICONS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(AWS_GENERATED_ICONS).map(([key, icon]) => [key, icon.svg]),
);
```

Build `AWS_SANITIZED_ICONS` from the same records without recreating artwork. Keep the provenance source URL and release identifier. Derive the manifest checksum from the sorted generated checksums rather than a hard-coded fake asset checksum.

- [ ] **Step 4: Run catalog and package verification to verify GREEN**

Run:

```bash
pnpm vitest run packages/aws/src/catalog/index.test.ts tests/aws-catalog.test.ts tests/aws-semantics.test.ts
pnpm --filter @cloudmer/aws build
pnpm --filter @cloudmer/aws typecheck
```

Expected: all commands exit 0 and all three service keys resolve to official artwork.

- [ ] **Step 5: Commit runtime icon integration**

```bash
git add packages/aws/src/icons/index.ts packages/aws/src/icons/manifest.ts packages/aws/src/catalog/index.test.ts tests/aws-catalog.test.ts tests/aws-semantics.test.ts
git commit -m "feat(aws): serve generated official icon artwork"
```

---

### Task 3: Deterministic compact label layout

**Files:**
- Create: `packages/renderer-svg/src/serializer/labels.ts`
- Create: `packages/renderer-svg/src/serializer/labels.test.ts`
- Modify: `packages/renderer-svg/src/serializer/index.ts`

**Interfaces:**
- Produces: `layoutNodeLabel(label: string, maxCharactersPerLine?: number): { lines: readonly string[]; truncated: boolean }`.
- Consumes: XML escaping remains the serializer's responsibility after line layout.

- [ ] **Step 1: Write failing label behavior tests**

```ts
expect(layoutNodeLabel("Amazon RDS", 16)).toEqual({ lines: ["Amazon RDS"], truncated: false });
expect(layoutNodeLabel("Amazon RDS Proxy", 12)).toEqual({ lines: ["Amazon RDS", "Proxy"], truncated: false });
expect(layoutNodeLabel("An Extremely Long Unsupported Service Name", 12)).toEqual({
  lines: ["An Extremely", "Long Unsupp…"],
  truncated: true,
});
```

Also test repeated whitespace normalization and a single word longer than the line limit.

- [ ] **Step 2: Run label tests and verify RED**

Run: `pnpm vitest run packages/renderer-svg/src/serializer/labels.test.ts`

Expected: FAIL because `layoutNodeLabel` does not exist.

- [ ] **Step 3: Implement minimal deterministic word wrapping**

Normalize whitespace, greedily fill the first line, fill the second line, and truncate only the second line with a single Unicode ellipsis. Do not measure browser fonts or mutate node geometry.

- [ ] **Step 4: Render labels as one or two `<tspan>` lines**

In the serializer, keep the complete escaped label in `aria-label` and render:

```xml
<text class="cloudmer-node-label" x="64" y="70" text-anchor="middle">
  <tspan x="64" dy="0">Amazon RDS</tspan>
  <tspan x="64" dy="14">Proxy</tspan>
</text>
```

Use a fixed label region below the icon and use the helper for both icon and text-only nodes.

- [ ] **Step 5: Run label and serializer tests to verify GREEN**

Run: `pnpm vitest run packages/renderer-svg/src/serializer/labels.test.ts packages/renderer-svg/src/serializer/index.test.ts`

Expected: label tests PASS; any serializer failures must be limited to old glassmorphism expectations intentionally replaced in Task 4.

- [ ] **Step 6: Commit label layout**

```bash
git add packages/renderer-svg/src/serializer/labels.ts packages/renderer-svg/src/serializer/labels.test.ts packages/renderer-svg/src/serializer/index.ts
git commit -m "feat(renderer): add deterministic two-line labels"
```

---

### Task 4: Mermaid-aligned SVG theme and serializer

**Files:**
- Modify: `packages/renderer-svg/src/theme/index.ts`
- Modify: `packages/renderer-svg/src/serializer/index.ts`
- Modify: `packages/renderer-svg/src/serializer/index.test.ts`
- Modify: `tests/renderer-production.test.ts`

**Interfaces:**
- Consumes: `layoutNodeLabel` from Task 3.
- Produces: unchanged `serializeSvgGraph(layoutGraph, diagnostics?, themeName?): SvgResult`.
- Produces theme tokens: `background`, `scopeFill`, `scopeStroke`, `scopeTextFill`, `nodeFill`, `nodeStroke`, `textFill`, `textMuted`, `edgeStroke`, `edgeHoverStroke`, `arrowFill`, `errorStroke`, `warningMarker`, `infoMarker`.

- [ ] **Step 1: Replace glassmorphism assertions with failing neutral-renderer assertions**

Add assertions that output:

```ts
expect(svg).toContain('class="cloudmer-node-surface"');
expect(svg).toContain('rx="6" ry="6"');
expect(svg).toContain('width="48" height="48"');
expect(svg).toContain('class="cloudmer-scope-label"');
expect(svg).toContain('stroke-width="1.5"');
expect(svg).not.toContain("cloudmer-node-bg");
expect(svg).not.toContain("cloudmer-sheen");
expect(svg).not.toContain("cloudmer-glow");
expect(svg).not.toContain("cloudmer-scope-header");
expect(svg).not.toContain("transition:");
```

Add diagnostic assertions for `stroke-dasharray` and a `cloudmer-status-marker` element. Keep the existing rounded orthogonal path test.

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `pnpm vitest run packages/renderer-svg/src/serializer/index.test.ts tests/renderer-production.test.ts`

Expected: FAIL on neutral node/scope requirements and absence of glass definitions.

- [ ] **Step 3: Reduce themes to neutral, equivalent light/dark tokens**

Remove glass gradients, sheen, badge, tier-specific saturated header, and glow tokens. Use restrained values such as:

```ts
// light
background: "#ffffff", nodeFill: "#ffffff", nodeStroke: "#aeb7c4",
scopeFill: "#f7f8fa", scopeStroke: "#9aa6b6", edgeStroke: "#667085"
// dark
background: "#111827", nodeFill: "#1f2937", nodeStroke: "#526174",
scopeFill: "#172131", scopeStroke: "#64748b", edgeStroke: "#94a3b8"
```

Keep contrast high enough for text and focus indicators in both themes.

- [ ] **Step 4: Render quiet scope containers and inline labels**

Parse scope kind/name as today, but return only fill, stroke, dash array, uppercase kind, and name. Render one boundary `<rect>` and one plain `<text class="cloudmer-scope-label">` with two tspans; do not render header rects, filters, or shadows. Use stroke variations `account: 6 4`, `region: none`, `vpc: 5 4`, `subnet: 3 3` with the same neutral palette.

- [ ] **Step 5: Render compact nodes and official artwork**

Render a 1px neutral surface with `rx=6`. For icon nodes, position official nested SVG at 48×48, centered horizontally in a fixed top region. Preserve its `viewBox`, remove only intrinsic width/height during positioning, and add `aria-hidden="true" focusable="false"`. Render label tspans below it. Text-only nodes center their label region vertically.

- [ ] **Step 6: Simplify markers and diagnostics**

Use compact markers with `markerUnits="strokeWidth"`, neutral arrow fill, and no filter. Keep rounded orthogonal paths at a 6–8px corner radius. Errors use red plus `stroke-dasharray="4 3"`; warnings use amber plus `stroke-dasharray="2 2"`; both render a small status marker containing `!` with an accessible diagnostic association.

- [ ] **Step 7: Remove active styling and verify safety/determinism**

Delete transition, transform, animation, gradient, sheen, and glow definitions. If hover emphasis remains, limit it to a non-animated stroke-width rule. Confirm no external references are introduced.

- [ ] **Step 8: Run focused and full renderer verification**

Run:

```bash
pnpm vitest run packages/renderer-svg/src/serializer/index.test.ts tests/renderer-production.test.ts tests/mount-safety.test.ts
pnpm --filter @cloudmer/renderer-svg build
pnpm --filter @cloudmer/renderer-svg typecheck
```

Expected: all commands exit 0.

- [ ] **Step 9: Commit Mermaid-aligned rendering**

```bash
git add packages/renderer-svg/src/theme/index.ts packages/renderer-svg/src/serializer/index.ts packages/renderer-svg/src/serializer/index.test.ts tests/renderer-production.test.ts
git commit -m "feat(renderer): adopt Mermaid-aligned AWS styling"
```

---

### Task 5: Layout sizing and endpoint acceptance

**Files:**
- Modify: `packages/layout-elk/src/adapter/index.ts`
- Modify: `tests/layout-production.test.ts`
- Modify: `tests/playground-integration.test.ts`

**Interfaces:**
- Consumes: compact renderer contract from Task 4.
- Produces: leaf node geometry with a 128×92 default for icon nodes and sufficient fixed label region; exact dimensions may be tuned once against official icon aspect ratios, but must remain deterministic in tests.

- [ ] **Step 1: Add failing geometry assertions for both acceptance graphs**

Assert resource nodes are compact and consistent, nested resources stay below scope labels, sibling rectangles do not overlap, and each edge first/last point lies on a source/target boundary rather than inside its interior.

Use helper assertions with concrete tolerances:

```ts
expect(node.width).toBe(128);
expect(node.height).toBe(92);
expect(Math.min(...children.map((child) => child.y))).toBeGreaterThanOrEqual(36);
expect(distanceFromRectangleBoundary(edge.points.at(-1)!, target)).toBeLessThanOrEqual(1);
```

- [ ] **Step 2: Run layout and integration tests and verify RED**

Run: `pnpm vitest run tests/layout-production.test.ts tests/playground-integration.test.ts`

Expected: FAIL on current node dimensions or scope header clearance.

- [ ] **Step 3: Update ELK measurement and padding constants minimally**

Change only the adapter's resource width/height and compound-node top padding needed for the renderer. Retain existing direction, port, routing, caching, and containment behavior. Do not compensate for visual problems with serializer transforms.

- [ ] **Step 4: Run all layout semantics to verify GREEN**

Run:

```bash
pnpm vitest run tests/layout-production.test.ts tests/playground-integration.test.ts tests/language-properties.test.ts tests/boundary-rules.test.ts
pnpm --filter @cloudmer/layout-elk typecheck
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit layout sizing**

```bash
git add packages/layout-elk/src/adapter/index.ts tests/layout-production.test.ts tests/playground-integration.test.ts
git commit -m "fix(layout): size compact architecture nodes"
```

---

### Task 6: Browser acceptance and visual QA

**Files:**
- Modify: `tests/browser/phase-one.spec.mjs`
- Create: `tests/browser/visual-acceptance.spec.mjs`
- Create after baseline review: `tests/browser/visual-acceptance.spec.mjs-snapshots/*.png`
- Modify if needed: `apps/playground/src/components/Preview.tsx`
- Modify if needed: `apps/playground/src/styles.css`

**Interfaces:**
- Consumes: final renderer and layout output from Tasks 1–5.
- Produces: Playwright coverage for both supplied scenarios, both themes, and desktop/narrow viewports.

- [ ] **Step 1: Add failing semantic browser assertions**

For the chain and nested examples, assert official icon keys exist, scope pills/glass defs do not, and DOM bounding boxes satisfy:

```js
expect(iconBox.y + iconBox.height).toBeLessThanOrEqual(labelBox.y);
expect(childBox.y).toBeGreaterThan(scopeLabelBox.y + scopeLabelBox.height);
expect(nodeBox.width).toBeLessThan(160);
```

Switch the toolbar through light and dark themes and repeat the visibility checks.

- [ ] **Step 2: Add screenshot tests and verify RED**

Use fixed viewports `{ width: 1440, height: 900 }` and `{ width: 820, height: 900 }`. Capture only the preview pane with animations disabled:

```js
await expect(page.getByTestId("preview")).toHaveScreenshot("chain-dark-desktop.png", {
  animations: "disabled",
  maxDiffPixelRatio: 0.01,
});
```

Add equivalent nested/light/narrow cases. Run: `pnpm test:browser -- tests/browser/phase-one.spec.mjs tests/browser/visual-acceptance.spec.mjs`

Expected: FAIL because new assertions and baselines are not satisfied/present.

- [ ] **Step 3: Make only playground-owned fit/canvas corrections**

If screenshots reveal clipping or poor fit, adjust preview container sizing, neutral canvas color, and SVG `max-width`/`max-height`. Do not duplicate diagram surface, node, edge, scope, or icon styling in CSS; exported fidelity remains renderer-owned.

- [ ] **Step 4: Review and write screenshot baselines**

Run: `pnpm test:browser -- tests/browser/phase-one.spec.mjs tests/browser/visual-acceptance.spec.mjs --update-snapshots`

Open every generated PNG and confirm: official icons are crisp, labels do not overlap, arrows meet node boundaries, nested scopes read in order, no neon/pills/glass effects remain, and both themes have readable contrast. If any check fails visually, fix production code first and regenerate.

- [ ] **Step 5: Run browser tests without updating snapshots**

Run: `pnpm test:browser -- tests/browser/phase-one.spec.mjs tests/browser/visual-acceptance.spec.mjs`

Expected: all browser cases PASS with zero screenshot differences above tolerance.

- [ ] **Step 6: Commit browser acceptance**

```bash
git add tests/browser/phase-one.spec.mjs tests/browser/visual-acceptance.spec.mjs tests/browser/visual-acceptance.spec.mjs-snapshots apps/playground/src/components/Preview.tsx apps/playground/src/styles.css
git commit -m "test(playground): cover Mermaid-aligned visual rendering"
```

---

### Task 7: Full verification and documentation reconciliation

**Files:**
- Modify: `docs/specs/layout-rendering.md`
- Modify or remove if obsolete: `docs/plans/2026-07-28-diagram-renderer-wow-design.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: documentation matching the shipped renderer and a clean repository state that ignores `.superpowers/` brainstorming artifacts.

- [ ] **Step 1: Update renderer documentation**

Document the official icon importer command, supported icon subset, neutral resource/scope system, deterministic two-line labels, non-color diagnostics, and the retained SVG safety guarantees. Mark the previous glassmorphism design as superseded or remove it only if it is confirmed to be untracked implementation debris rather than user documentation.

- [ ] **Step 2: Ignore visual companion state**

Add `/.superpowers/` to `.gitignore`; do not delete the user's local companion session.

- [ ] **Step 3: Run fresh complete verification**

Run:

```bash
pnpm --filter @cloudmer/aws icons:check
pnpm check
pnpm test:browser
git diff --check
git status --short
```

Expected: importer check, build, typecheck, unit tests, lint, and all browser tests exit 0; `git diff --check` is silent; status contains only intentional changes or pre-existing unrelated user changes.

- [ ] **Step 4: Re-read the approved spec as an acceptance checklist**

Confirm each objective, scope limit, asset rule, resource-node rule, scope rule, edge rule, theme/diagnostic rule, SVG guarantee, playground case, error case, and testing requirement has direct evidence from a passing test or inspected screenshot. Record any gap and fix it before committing.

- [ ] **Step 5: Commit final documentation and ignore rule**

```bash
git add docs/specs/layout-rendering.md docs/plans/2026-07-28-diagram-renderer-wow-design.md .gitignore
git commit -m "docs: document official AWS rendering workflow"
```

- [ ] **Step 6: Inspect the final branch history and diff**

Run:

```bash
git log --oneline --decorate -8
git diff master~7..HEAD --stat
```

Expected: focused commits for importer, runtime icons, labels, renderer, layout, browser acceptance, and docs, with no `.superpowers/` files or unrelated workspace changes included.
