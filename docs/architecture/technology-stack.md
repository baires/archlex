# Technology Stack

## Locked choices

| Area | Choice | Policy |
| --- | --- | --- |
| Runtime | Node.js 22 | Supported non-browser runtime |
| Language | Strict TypeScript | ESM-only public packages |
| Workspace | pnpm + Turborepo | One lockfile and dependency-aware cached tasks |
| Builds | Vite library mode | `dist/` per package; TypeScript project references validate boundaries |
| Parser | Chevrotain | Recovery enabled; private CST converted to CloudMer AST |
| Layout | ELK.js layered | Worker in browsers, inline in Node/tests |
| Rendering | Custom SVG serializer | DOM-free deterministic SVG string |
| Playground | React + Vite + Monaco | Imports public core APIs only |
| Quality | Biome + strict `tsc` | Formatting, linting, and types |
| Tests | Vitest, fast-check, Playwright, axe-core | Node unit/property, Chromium browser/e2e/accessibility |
| Releases | Changesets + GitHub Actions | npm provenance after all gates pass |

Root scripts expose `build`, `test`, `typecheck`, `lint`, and `check` through Turborepo. Workspace dependencies use `workspace:^`; build artifacts are declared Turbo outputs.

Mermaid is research inspiration only. Langium is deferred because MVP LSP features do not justify its generated model framework. Rust/Wasm requires a measured bottleneck. C/C++ is out of scope.

## AWS assets

Official AWS architecture archives are downloaded deliberately, never at runtime. Ingestion records release ID, URL, SHA-256, and retrieval date; extracts to temporary storage; rejects scripts, event handlers, external URLs, `foreignObject`, and malformed XML; then normalizes names and view boxes.

Generated output includes sanitized SVG fragments, a canonical service/alias manifest, upstream/attribution metadata, and deterministic checksum. CI regenerates and diffs output. No third-party icon CDN is required.

## Compatibility

- Modern browser APIs from current stable Chromium, Firefox, and Safari; Chromium is the MVP CI gate.
- Firefox and WebKit automation is required before `1.0`.
- Node 22 supports parse, analysis, inline layout, SVG rendering, and orchestration.
- Worker layout, `mountSvg`, Monaco, and the playground are browser-only.
- No CommonJS, backend service, runtime CDN, or browser polyfill is in the MVP.

Packages remain private until Phase 6 confirms npm-scope ownership, asset licensing, exports, documentation, and clean-consumer installation.
