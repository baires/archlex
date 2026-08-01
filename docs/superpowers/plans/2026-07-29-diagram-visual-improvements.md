# Diagram Visual Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve complex ArchLex diagrams with complete AWS service artwork, semantic edge labels, usable viewport controls, clearer nested layout and boundaries, and a connected enterprise example.

**Architecture:** Extend the existing deterministic icon import pipeline and SVG serializer rather than adding runtime assets. Keep graph geometry in `layout-elk`, presentation in `renderer-svg`, and viewport interaction in the React playground so exported SVG remains independent from editor controls.

**Tech Stack:** TypeScript, React 19, SVG, ELK.js, Vitest, Playwright, Biome, pnpm/Turbo.

## Global Constraints

- Preserve the deterministic, sanitized inline-SVG icon pipeline.
- Use official AWS Architecture Icons from release `04302026`.
- Write each behavioral test first and observe the expected failure before production changes.
- Preserve all four layout directions and SVG accessibility semantics.
- Do not modify the user's untracked files in the primary checkout.

---

### Task 1: Complete AWS Icon Coverage

**Files:**
- Create: `packages/aws/assets/official/*.svg` for every non-boundary catalog service
- Modify: `packages/aws/scripts/import-official-icons.mjs`
- Modify: `packages/aws/src/icons/generated.ts`
- Test: `packages/aws/src/catalog/index.test.ts`
- Test: `packages/aws/src/icons/importer.test.ts`

**Interfaces:**
- Consumes: `initialServices: ResourceDefinition[]`, `generateIconModule(entries)`
- Produces: provider metadata with a defined `iconSvg` for every service whose category is not `boundary`

- [ ] Add a catalog test that filters out `boundary` definitions and expects every resolved service to contain official inline SVG.
- [ ] Run `pnpm vitest run packages/aws/src/catalog/index.test.ts` and confirm the new coverage assertion fails on the currently missing services.
- [ ] Extract the 48 px official service SVGs for API Gateway, Lambda, DynamoDB, S3, EventBridge, SNS, SQS, Route 53, CloudFront, ELB/ALB, ElastiCache, EKS, EC2, NLB, route table, security group, and IAM from the AWS `04302026` package; add deterministic importer entries.
- [ ] Regenerate `generated.ts`, update manifest checksum assertions, and run the AWS tests until green.

### Task 2: Render Semantic Relationship Labels

**Files:**
- Modify: `packages/renderer-svg/src/serializer/index.ts`
- Test: `packages/renderer-svg/src/serializer/index.test.ts`
- Test: `tests/playground-integration.test.ts`

**Interfaces:**
- Consumes: `LayoutEdge.label?: string`, `routeMidpoint(points)`
- Produces: `.archlex-edge-label` SVG groups with escaped text, background surface, and accessible edge naming

- [ ] Add serializer tests expecting escaped label text, midpoint placement, a legibility surface, and no label group for unlabeled edges.
- [ ] Run the serializer test and confirm failure because the label is not currently emitted.
- [ ] Render each label at the cumulative route midpoint with a compact rounded background and update the edge accessible label.
- [ ] Add an integration assertion that the event-pipeline relationship verbs survive end-to-end rendering; run focused tests until green.

### Task 3: Add Zoom, Pan, Fit, and 100% Controls

**Files:**
- Create: `apps/playground/src/components/preview-transform.ts`
- Create: `apps/playground/src/components/preview-transform.test.ts`
- Modify: `apps/playground/src/components/Preview.tsx`
- Modify: `apps/playground/src/styles.css`
- Modify: `tests/browser/phase-one.spec.mjs`

**Interfaces:**
- Produces: pure clamped zoom helpers and accessible `Zoom out`, `Zoom in`, `Fit diagram`, and `Actual size` buttons

- [ ] Add failing unit tests for zoom clamping and fit-scale calculation.
- [ ] Implement the pure transform helpers and make the unit tests green.
- [ ] Add browser assertions for the four controls, wheel zoom, pointer drag, keyboard activation, and reset-on-new-SVG behavior; confirm the browser test fails.
- [ ] Implement a transform stage around the mounted SVG using pointer capture and CSS transforms, with visible scale feedback and reduced-motion-safe styles; run focused browser tests until green.

### Task 4: Improve Complex ELK Layout Presets

**Files:**
- Modify: `packages/layout-elk/src/adapter/index.ts`
- Test: `tests/layout-production.test.ts`
- Test: `tests/playground-integration.test.ts`

**Interfaces:**
- Consumes: `buildElkGraph(graph, direction)`
- Produces: orthogonal routing, stable model order, larger layer spacing, and hierarchy-aware scope spacing

- [ ] Add tests that inspect ELK options and complex-example geometry for orthogonal multi-segment routes, stable ordering, and non-overlapping scopes.
- [ ] Run focused layout tests and confirm the options/geometry assertions fail.
- [ ] Add layered-layout options for orthogonal routing, model-order preservation, layer spacing, edge/node spacing, and hierarchy handling without changing card dimensions.
- [ ] Run layout and integration tests for LR, RL, TB, and BT until green.

### Task 5: Strengthen Boundary Visual Hierarchy

**Files:**
- Modify: `packages/renderer-svg/src/theme/index.ts`
- Modify: `packages/renderer-svg/src/serializer/index.ts`
- Test: `packages/renderer-svg/src/theme/index.test.ts`
- Test: `packages/renderer-svg/src/serializer/index.test.ts`

**Interfaces:**
- Produces: kind-specific account/region/VPC/subnet header accents and `data-archlex-scope-kind` hooks while preserving quiet transparent fills

- [ ] Add failing tests requiring distinct scope-kind accents in both themes and semantic data attributes in serialized SVG.
- [ ] Add accessible, restrained header rules and kind-specific accent tokens; keep child content and edges unobscured.
- [ ] Run renderer/theme tests until green and inspect dark/light complex renders.

### Task 6: Connect the Enterprise Example

**Files:**
- Modify: `apps/playground/src/examples.ts`
- Test: `tests/playground-integration.test.ts`

**Interfaces:**
- Produces: the path `apigw > ingress > web_app` in the `enterprise-cloud` example

- [ ] Add a failing integration test that finds the enterprise ALB and verifies it has incoming and outgoing edges.
- [ ] Replace the direct API Gateway-to-ECS edge with API Gateway-to-ALB-to-ECS.
- [ ] Run the integration test until green.

### Task 7: Final Verification and Visual Baselines

**Files:**
- Modify: `tests/browser/visual-acceptance.spec.mjs`
- Modify: reviewed Darwin snapshots under `tests/browser/visual-acceptance.spec.mjs-snapshots/`

- [ ] Add event-pipeline and enterprise scenarios to visual acceptance coverage.
- [ ] Run `pnpm check`, `pnpm test:browser`, and `pnpm --filter @archlex/aws icons:check`.
- [ ] Inspect generated screenshots for icon completeness, readable edge labels, useful default fit, clean routing, boundary hierarchy, and the connected ALB.
- [ ] Review `git diff --check`, `git status --short`, and the six-recommendation checklist before handoff.
