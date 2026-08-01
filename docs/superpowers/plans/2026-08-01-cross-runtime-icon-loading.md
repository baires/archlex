# Cross-Runtime Icon Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the static playground fetch missing AWS and GCP icons safely from version-pinned CDNs while preserving Node filesystem caching and a synchronous, network-free renderer.

**Architecture:** Extract runtime-neutral icon contracts, sanitization, provider resolution, and orchestration into `@archlex/icons-core`; configure it through browser and Node adapters. Add a prepare/load/render boundary to `@archlex/core`, then make the playground cancel and ignore stale icon batches before rendering with an injected icon registry.

**Tech Stack:** TypeScript 5.7, Vite 6, Vitest 3, React 19, Web Crypto, Fetch API, `@xmldom/xmldom`, pnpm workspaces, Turbo.

## Global Constraints

- The playground remains a fully static Vite deployment with no proxy or backend.
- Rendering never initiates network requests.
- Browser code must not import `node:*` modules or reference `process.env`.
- CDN URLs must use HTTPS, an explicit allowlist, and pinned versions rather than `latest`.
- Every fetched SVG is size-checked and sanitized before registry insertion or caching.
- Icon failures are non-fatal and resolve to the bundled generic fallback plus structured warnings.
- The first browser release uses in-memory application caching and ordinary HTTP caching, not IndexedDB or a service worker.
- Node consumers retain filesystem TTL, atomic writes, and expired-cache fallback.
- Provider registration is explicit and has no import-time side effects.

---

## File Structure

- `packages/icons-core/src/types.ts`: shared requests, results, diagnostics, providers, cache, fetch, and sanitized-icon contracts.
- `packages/icons-core/src/sanitizer.ts`: browser-safe SVG validation, normalization, size limit, and Web Crypto checksum.
- `packages/icons-core/src/provider.ts`: allowlisted, version-pinned CDN candidate construction and fetching.
- `packages/icons-core/src/loader.ts`: deduplication, concurrency, cache orchestration, negative cache, fallback, and batch loading.
- `packages/icons-browser/src/index.ts`: browser loader factory using `globalThis.fetch` and memory caching.
- `packages/icons-node/src/cache.ts`: existing filesystem cache behavior.
- `packages/icons-node/src/index.ts`: Node loader factory and environment configuration.
- `packages/aws/src/icons/cdn.ts`, `packages/gcp/src/icons/cdn.ts`: pure provider definitions and mappings.
- `packages/core/src/icon-registry.ts`: collect icon requests and apply immutable icon records to graphs.
- `packages/core/src/index.ts`: `prepare()` and `renderPrepared()` pipeline APIs.
- `apps/playground/src/icon-loader.ts`: browser provider registration and loader singleton.
- `apps/playground/src/render-pipeline.ts`: abortable prepare/load/render orchestration with operation IDs.

### Task 1: Create the Browser-Safe Icon Core Contracts and Sanitizer

**Files:**
- Create: `packages/icons-core/package.json`
- Create: `packages/icons-core/tsconfig.json`
- Create: `packages/icons-core/vite.config.ts`
- Create: `packages/icons-core/src/types.ts`
- Create: `packages/icons-core/src/fallback.ts`
- Create: `packages/icons-core/src/sanitizer.ts`
- Create: `packages/icons-core/src/sanitizer.test.ts`
- Create: `packages/icons-core/src/index.ts`

**Interfaces:**
- Produces: `IconRequest`, `SanitizedIcon`, `IconDiagnostic`, `IconRegistry`, `IconCache`, `FetchIcon`, `CdnProviderDefinition`, `sanitizeSvg(provider, key, rawSvg, options): Promise<SanitizedIcon>`.
- Consumes: `DOMParser` and `XMLSerializer` from `@xmldom/xmldom`; `globalThis.crypto.subtle` for SHA-256.

- [ ] **Step 1: Scaffold the package and declare its browser-safe exports**

Use the same Vite/TypeScript scripts as `packages/icons`, depend only on `@xmldom/xmldom`, and export only `fallback`, `sanitizer`, and `types` from `src/index.ts`. Configure Vite to build one ES module without any `node:*` external.

- [ ] **Step 2: Write failing sanitizer and checksum tests**

```ts
it("returns a stable Web Crypto checksum", async () => {
  const a = await sanitizeSvg("aws", "lambda", SAFE_SVG);
  const b = await sanitizeSvg("aws", "lambda", SAFE_SVG);
  expect(a.checksum).toMatch(/^[a-f0-9]{64}$/);
  expect(a).toEqual(b);
});

it.each(["<script>alert(1)</script>", "onclick='alert(1)'", "<!DOCTYPE svg>"])(
  "rejects active SVG content: %s",
  async (payload) => {
    await expect(
      sanitizeSvg("aws", "bad", `<svg viewBox="0 0 24 24">${payload}</svg>`),
    ).rejects.toThrow();
  },
);

it("rejects SVG payloads above the configured byte limit", async () => {
  await expect(
    sanitizeSvg("aws", "large", SAFE_SVG, { maxBytes: 8 }),
  ).rejects.toThrow("exceeds 8 bytes");
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

Run: `pnpm --filter @archlex/icons-core test -- sanitizer.test.ts`

Expected: FAIL because the package or `sanitizeSvg` does not exist.

- [ ] **Step 4: Port sanitization and replace Node crypto with Web Crypto**

Define the shared contracts exactly as:

```ts
export interface IconRequest { readonly provider: string; readonly key: string }
export type IconRegistry = ReadonlyMap<string, SanitizedIcon>;
export interface IconDiagnostic {
  readonly provider: string;
  readonly key: string;
  readonly code: "ICON_FETCH_FAILED" | "ICON_INVALID" | "ICON_TOO_LARGE" | "ICON_UNMAPPED";
  readonly message: string;
}
export interface IconCache {
  get(request: IconRequest, options?: { allowExpired?: boolean }): Promise<SanitizedIcon | undefined>;
  set(request: IconRequest, icon: SanitizedIcon, source: string): Promise<void>;
}
```

Port the current element and attribute allowlists. Compute the checksum with:

```ts
const bytes = new TextEncoder().encode(svgFragment);
const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
const checksum = Array.from(new Uint8Array(digest), (byte) =>
  byte.toString(16).padStart(2, "0"),
).join("");
```

- [ ] **Step 5: Run tests, typecheck, and inspect the bundle**

Run: `pnpm --filter @archlex/icons-core test && pnpm --filter @archlex/icons-core typecheck && pnpm --filter @archlex/icons-core build && ! rg 'node:|process\.env' packages/icons-core/dist`

Expected: all commands PASS and the final search finds nothing.

- [ ] **Step 6: Commit the core contracts and sanitizer**

```bash
git add packages/icons-core
git commit -m "feat(icons): add browser-safe icon core"
```

### Task 2: Add Provider Resolution and the Shared Concurrent Loader

**Files:**
- Modify: `packages/icons-core/src/types.ts`
- Create: `packages/icons-core/src/provider.ts`
- Create: `packages/icons-core/src/provider.test.ts`
- Create: `packages/icons-core/src/loader.ts`
- Create: `packages/icons-core/src/loader.test.ts`
- Modify: `packages/icons-core/src/index.ts`

**Interfaces:**
- Consumes: Task 1 `IconRequest`, `IconCache`, `SanitizedIcon`, `IconDiagnostic`, and `sanitizeSvg`.
- Produces: `createIconLoader(options): IconLoader`, where `IconLoader.loadIcons(requests, { signal? }): Promise<IconLoadResult>` and `IconLoadResult` is `{ icons: ReadonlyMap<string, SanitizedIcon>; diagnostics: readonly IconDiagnostic[] }`.

- [ ] **Step 1: Write failing provider security tests**

```ts
expect(() => createCdnProvider({ ...definition, baseUrl: "http://icons.test/v1" }, fetchFn))
  .toThrow("HTTPS");
expect(() => createCdnProvider({ ...definition, baseUrl: "https://evil.test/v1" }, fetchFn))
  .toThrow("allowlist");
expect(() => createCdnProvider({ ...definition, baseUrl: "https://icons.test/latest" }, fetchFn))
  .toThrow("pinned");
```

Also assert mapped, PascalCase, camelCase, and lowercase candidates preserve order and do not produce duplicates.

- [ ] **Step 2: Write failing loader behavior tests**

Use deferred fetch promises to prove that three concurrent requests for `aws/lambda` invoke `fetchFn` once, that concurrency never exceeds `2`, abort yields `AbortError`, a malformed SVG yields `ICON_INVALID`, and two immediate 404 batches use the negative cache rather than fetching twice.

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `pnpm --filter @archlex/icons-core test -- provider.test.ts loader.test.ts`

Expected: FAIL because provider and loader APIs are missing.

- [ ] **Step 4: Implement provider construction and bounded fetching**

Define `CdnProviderDefinition` with `baseUrl`, `allowedHosts`, `releaseId`, `fileExtension`, mappings, optional per-icon raw-response SHA-256 integrity values, attribution, timeout, and maximum response bytes. Reject non-HTTPS URLs, hosts outside `allowedHosts`, moving path segments (`latest`, `next`, `main`, `master`), and definitions that have neither a versioned URL nor per-icon integrity. When an integrity value exists, hash the raw response bytes with Web Crypto before sanitization and reject a mismatch as `ICON_INVALID`.

- [ ] **Step 5: Implement the shared loader**

Use a `Map<string, Promise<SanitizedIcon>>` keyed by `${provider}:${key}` for in-flight deduplication, a FIFO semaphore for concurrency, and a `Map<string, number>` for negative-cache expiry. Resolution order is memory/cache → CDN → sanitize → cache; failure order is expired cache → generic sanitized fallback. Do not convert caller cancellation into an icon warning.

- [ ] **Step 6: Run the package test suite**

Run: `pnpm --filter @archlex/icons-core test && pnpm --filter @archlex/icons-core typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the shared loader**

```bash
git add packages/icons-core/src
git commit -m "feat(icons): add cross-runtime icon loader"
```

### Task 3: Add Browser and Node Runtime Adapters

**Files:**
- Create: `packages/icons-browser/package.json`
- Create: `packages/icons-browser/tsconfig.json`
- Create: `packages/icons-browser/vite.config.ts`
- Create: `packages/icons-browser/src/memory-cache.ts`
- Create: `packages/icons-browser/src/index.ts`
- Create: `packages/icons-browser/src/index.test.ts`
- Create: `packages/icons-node/package.json`
- Create: `packages/icons-node/tsconfig.json`
- Create: `packages/icons-node/vite.config.ts`
- Create: `packages/icons-node/src/cache.ts`
- Create: `packages/icons-node/src/index.ts`
- Create: `packages/icons-node/src/index.test.ts`
- Modify: `packages/icons/package.json`
- Modify: `packages/icons/src/index.ts`

**Interfaces:**
- Consumes: Task 2 `createIconLoader`, provider definitions, and cache interfaces.
- Produces: `createBrowserIconLoader({ providers, fetchFn?, concurrency?, negativeCacheMs? })` and `createNodeIconLoader({ providers, fetchFn?, cacheDir?, ttlDays? })`.

- [ ] **Step 1: Write failing adapter contract tests**

Feed both adapters the same SVG fixture and assert equivalent `{ provider, key, viewBox, svgFragment, checksum }`. Assert two browser loads reuse memory, while a reconstructed Node loader reuses a temporary filesystem cache. Assert the browser build contains no Node references.

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run: `pnpm --filter @archlex/icons-browser test && pnpm --filter @archlex/icons-node test`

Expected: FAIL because both adapters are missing.

- [ ] **Step 3: Implement the browser adapter**

Implement `MemoryIconCache` using `Map<string, SanitizedIcon>`. Its `get` and `set` fulfill `IconCache`; the browser loader factory injects `fetchFn ?? globalThis.fetch.bind(globalThis)` and never reads environment variables.

- [ ] **Step 4: Move filesystem caching into the Node adapter**

Port `packages/icons/src/cache.ts`, retaining cache filenames, TTL, atomic temporary writes, and `allowExpired`. Read `ARCHLEX_ICON_CACHE_DIR`, `ARCHLEX_ICON_CACHE_TTL`, `ARCHLEX_DISABLE_CDN_ICONS`, and `ARCHLEX_DEBUG` only inside `packages/icons-node`.

- [ ] **Step 5: Convert `@archlex/icons` into a Node compatibility facade**

Re-export `@archlex/icons-core` and `@archlex/icons-node`, add both as workspace dependencies, and remove browser claims from its package exports. Keep current Node import paths working during migration.

- [ ] **Step 6: Verify both runtime boundaries**

Run: `pnpm --filter @archlex/icons-browser test && pnpm --filter @archlex/icons-node test && pnpm --filter @archlex/icons-browser build && ! rg 'node:|process\.env' packages/icons-browser/dist`

Expected: PASS with no Node reference in the browser bundle.

- [ ] **Step 7: Commit the adapters**

```bash
git add packages/icons packages/icons-browser packages/icons-node
git commit -m "feat(icons): add browser and node adapters"
```

### Task 4: Make AWS and GCP CDN Definitions Pure and Version-Pinned

**Files:**
- Modify: `packages/aws/package.json`
- Modify: `packages/aws/src/icons/cdn.ts`
- Modify: `packages/aws/src/icons/cdn.test.ts`
- Modify: `packages/aws/src/index.ts`
- Modify: `packages/gcp/package.json`
- Modify: `packages/gcp/src/icons/cdn.ts`
- Modify: `packages/gcp/src/icons/cdn.test.ts`
- Modify: `packages/gcp/src/index.ts`

**Interfaces:**
- Consumes: Task 2 `CdnProviderDefinition` from `@archlex/icons-core`.
- Produces: `AWS_CDN_PROVIDER` and `GCP_CDN_PROVIDER`; importing either provider package performs no dynamic import or registration.

- [ ] **Step 1: Write failing purity and configuration tests**

Assert both definitions use HTTPS, contain an explicit `releaseId`, have `new URL(baseUrl).hostname` in `allowedHosts`, and exclude `latest`. Assert the AWS definition uses `https://unpkg.com/aws-icons@3.3.0/icons/architecture-service` and canonical names such as `AWSLambda`; assert the GCP definition uses release ID `icepanel-gcp-2023-03-25` and carries a SHA-256 value for every mapped asset. Mock module loading and assert importing provider packages does not call a loader registration function.

- [ ] **Step 2: Run the provider tests to verify they fail**

Run: `pnpm --filter @archlex/aws test -- cdn.test.ts && pnpm --filter @archlex/gcp test -- cdn.test.ts`

Expected: FAIL because AWS uses `@latest` and both modules self-register.

- [ ] **Step 3: Export pure definitions**

Remove the Node runtime check and dynamic import blocks. Replace `CdnProviderConfig` with `CdnProviderDefinition`. Pin AWS to `aws-icons@3.3.0`, use its `icons/architecture-service` directory, and update mappings to package filenames (`lambda: "AWSLambda"`, `cloudfront: "AmazonCloudFront"`, and so on). Keep IcePanel's CORS-enabled GCP base URL, label the captured upstream set `icepanel-gcp-2023-03-25`, and generate a checked-in SHA-256 integrity map from the provider's mapped SVGs so changed upstream bytes are rejected. Preserve both providers' license and source attribution.

- [ ] **Step 4: Verify provider packages**

Run: `pnpm --filter @archlex/aws test && pnpm --filter @archlex/gcp test && pnpm --filter @archlex/aws build && pnpm --filter @archlex/gcp build`

Expected: PASS.

- [ ] **Step 5: Commit pure provider definitions**

```bash
git add packages/aws packages/gcp
git commit -m "refactor(icons): export pure provider definitions"
```

### Task 5: Add Prepare, Icon Registry, and Render-Prepared APIs to Core

**Files:**
- Create: `packages/core/src/icon-registry.ts`
- Create: `packages/core/src/icon-registry.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/index.test.ts`

**Interfaces:**
- Consumes: Task 1 `IconRequest`, `IconRegistry`, and `SanitizedIcon` types.
- Produces: `PreparedDiagram`, `ArchLex.prepare(source, options?)`, and `ArchLex.renderPrepared(prepared, options?)`.

- [ ] **Step 1: Write failing icon-registry tests**

```ts
expect(collectIconRequests(graph)).toEqual([
  { provider: "aws", key: "apprunner" },
]);
const applied = applyIconRegistry(graph, new Map([
  ["aws:apprunner", fetchedIcon],
]));
expect(applied.nodes[0].icon).toBe(fetchedIcon.svgFragment);
expect(graph.nodes[0].icon).toBeUndefined();
```

Also assert duplicate graph nodes yield one request and bundled `node.icon` values do not yield CDN requests.

- [ ] **Step 2: Write failing prepare/render tests**

Assert `prepare("apprunner")` exposes one request and parse/analysis diagnostics; `renderPrepared(prepared, { icons })` embeds the fetched fragment; and calling it twice with identical inputs returns byte-identical SVG.

- [ ] **Step 3: Run focused tests to verify they fail**

Run: `pnpm --filter @archlex/core test -- icon-registry.test.ts index.test.ts`

Expected: FAIL because the APIs do not exist.

- [ ] **Step 4: Implement immutable registry application**

Use canonical keys `${node.provider}:${node.iconKey with the provider prefix removed}`. Clone only nodes whose missing icon is present in the registry; never mutate the analyzed or prepared graph.

- [ ] **Step 5: Split the render pipeline without duplicating parsing**

Define:

```ts
export interface PreparedDiagram {
  readonly ast: DocumentAst;
  readonly graph: CloudGraph;
  readonly diagnostics: readonly Diagnostic[];
  readonly iconRequests: readonly IconRequest[];
  readonly direction?: LayoutOptions["direction"];
}
```

`prepare` runs parse and analyze. `renderPrepared` applies icons, runs layout, combines diagnostics, and renders. Existing `render` delegates to these two operations so current consumers remain compatible.

- [ ] **Step 6: Verify core behavior**

Run: `pnpm --filter @archlex/core test && pnpm --filter @archlex/core typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the core pipeline boundary**

```bash
git add packages/core/src
git commit -m "feat(core): prepare diagrams with injectable icons"
```

### Task 6: Integrate Dynamic Loading into the Static Playground

**Files:**
- Modify: `apps/playground/package.json`
- Create: `apps/playground/src/icon-loader.ts`
- Create: `apps/playground/src/render-pipeline.ts`
- Create: `apps/playground/src/render-pipeline.test.ts`
- Modify: `apps/playground/src/App.tsx`

**Interfaces:**
- Consumes: `createBrowserIconLoader`, `AWS_CDN_PROVIDER`, `GCP_CDN_PROVIDER`, `ArchLex.prepare`, and `ArchLex.renderPrepared`.
- Produces: `renderWithIcons(archlex, iconLoader, source, options): Promise<RenderWithIconsResult>`.

- [ ] **Step 1: Write failing orchestration tests**

Test a CDN-only icon reaches `renderPrepared`, a rejected fetch still renders with a fallback warning, abort prevents completion, and operation `1` finishing after operation `2` cannot be applied. Use fake loaders and an operation guard rather than real network calls.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter @archlex/playground test -- render-pipeline.test.ts`

Expected: FAIL because the playground has no test script or orchestration module.

- [ ] **Step 3: Add the test script and browser loader singleton**

Add `"test": "vitest run --passWithNoTests"` and dependencies on `@archlex/icons-browser`, `@archlex/icons-core`, `@archlex/aws`, and `@archlex/gcp`. Register both pure provider definitions explicitly in `icon-loader.ts`.

- [ ] **Step 4: Implement `renderWithIcons`**

Call `prepare`, then `loadIcons(prepared.iconRequests, { signal })`, then `renderPrepared(prepared, { icons, signal, direction, validation, theme })`. Return render output and icon warnings separately so they do not enter semantic diagnostics.

- [ ] **Step 5: Replace the App render effect**

Keep the 150 ms debounce and `AbortController`. Add a monotonically increasing operation ref; update SVG and diagnostics only when the operation is still current. Keep the last successful SVG visible while `isRendering` is true. Treat `AbortError` as expected cancellation.

- [ ] **Step 6: Verify playground behavior and browser boundaries**

Run: `pnpm --filter @archlex/playground test && pnpm --filter @archlex/playground typecheck && pnpm --filter @archlex/playground build && ! rg 'node:fs|node:path|node:os|process\.env' apps/playground/dist`

Expected: PASS and no Node-only reference in the static bundle.

- [ ] **Step 7: Commit the playground integration**

```bash
git add apps/playground
git commit -m "feat(playground): load missing icons from CDN"
```

### Task 7: Add Cross-Runtime and Static-Build Regression Coverage

**Files:**
- Create: `tests/cross-runtime-icons.test.ts`
- Create: `tests/playground-dynamic-icons.test.ts`
- Modify: `vitest.config.ts`
- Modify: `docs/guides/dynamic-cdn-icons.md`
- Modify: `docs/architecture/contribution-guide.md`
- Add: `.changeset/cross-runtime-icons.md`

**Interfaces:**
- Consumes: all APIs produced in Tasks 1–6.
- Produces: repository-level guarantees for adapter equivalence, mixed-icon rendering, fallback rendering, and documented runtime entry points.

- [ ] **Step 1: Write failing repository-level regression tests**

Use fixture fetch responses to assert browser and Node records are identical, three same-key nodes cause one request, a diagram mixing bundled and fetched icons embeds both, and invalid CDN SVG produces a complete diagram with a fallback. Do not call public CDNs in tests.

- [ ] **Step 2: Run the regression tests**

Run: `pnpm vitest run tests/cross-runtime-icons.test.ts tests/playground-dynamic-icons.test.ts`

Expected: PASS if Tasks 1–6 satisfy the public contracts; otherwise fix the owning task rather than weakening assertions.

- [ ] **Step 3: Update documentation and package migration guidance**

Document `@archlex/icons-browser`, `@archlex/icons-node`, explicit provider definitions, the prepare/load/render example, version-pinned CDN requirements, HTTP versus filesystem caching, non-fatal warnings, and the planned VS Code extension-host flow. Remove guidance that says CDN loading is unavailable in browsers.

- [ ] **Step 4: Add changesets**

Record minor releases for new browser/core/node icon packages and core API additions, and patch releases for AWS, GCP, and playground integration according to the repository's existing changeset format.

- [ ] **Step 5: Run full verification**

Run: `pnpm check && pnpm test:browser`

Expected: all builds, typechecks, unit tests, lint checks, catalog validation hooks, and browser tests PASS.

- [ ] **Step 6: Review browser artifacts manually**

Run: `pnpm --filter @archlex/playground preview --host 127.0.0.1 --port 4173`

Open a diagram containing one bundled icon and one known CDN-only service, confirm both render, then block the CDN and confirm the diagram still renders with a generic icon and non-fatal warning.

- [ ] **Step 7: Commit regression coverage and documentation**

```bash
git add tests vitest.config.ts docs .changeset
git commit -m "test: verify cross-runtime dynamic icons"
```

## Final Verification Checklist

- [ ] `pnpm check` passes from the repository root.
- [ ] `pnpm test:browser` passes.
- [ ] `pnpm --filter @archlex/playground build` produces a static bundle.
- [ ] `rg 'node:fs|node:path|node:os|process\.env' apps/playground/dist packages/icons-browser/dist packages/icons-core/dist` returns no matches.
- [ ] A CDN-only icon renders in the playground through a fixture or controlled approved CDN.
- [ ] Network and sanitizer failures produce a complete fallback diagram.
- [ ] Node adapter tests prove cache persistence across loader instances.
- [ ] Browser and Node adapters produce equivalent sanitized records.
- [ ] No provider package registers a loader at import time.
