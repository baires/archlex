# Cross-Runtime Dynamic Icon Loading Design

## Context

Archlex can dynamically fetch AWS and GCP icons in Node.js, but the current
`@archlex/icons` entry point imports Node-only filesystem, path, OS, and
environment APIs. The playground is a static browser application and cannot
load that package. The rendering pipeline also resolves service metadata and
icons synchronously, while CDN retrieval is asynchronous.

The next runtime will be a VS Code extension. Its extension host can use Node.js
and persistent filesystem storage, while its webview is browser-like and should
not fetch or sanitize icons independently.

## Goals

- Render bundled and CDN-fetched icons in the fully static playground.
- Allow CDN requests while editing without making rendering depend on network
  availability.
- Share provider mappings, URL resolution, sanitization, checksums, fallbacks,
  and request behavior across browser, Node.js, and a future VS Code extension.
- Preserve deterministic, synchronous, network-free final rendering.
- Continue using the existing Node filesystem cache.
- Rely on normal browser HTTP caching in the first browser release.

## Non-Goals

- IndexedDB or service-worker caching in the first release.
- A playground backend or icon proxy.
- Automatic failover across multiple CDNs.
- Direct CDN requests from a VS Code webview.
- Replacing every bundled icon with a runtime request.

## Decision

Split icon loading into runtime-neutral behavior and runtime-specific adapters.
The browser and Node adapters will use the same core loader contract. Consumers
will prepare a diagram, asynchronously resolve its missing icons, and then pass
an icon registry into the existing synchronous renderer.

Rendering itself will never initiate network requests.

## Package Boundaries

### `@archlex/icons-core`

This browser-safe package owns:

- icon and provider types;
- provider registration and URL candidate generation;
- service-to-CDN name mappings;
- SVG validation and sanitization;
- Web Crypto-based checksum generation;
- the generic fallback icon;
- request deduplication and concurrency control;
- structured icon diagnostics; and
- cache and fetch interfaces injected by runtime adapters.

It must not import `node:*` modules or reference Node-specific globals such as
`process.env`.

### `@archlex/icons-browser`

This package configures `icons-core` with `globalThis.fetch`, an in-memory icon
cache, and browser runtime options. HTTP persistence is delegated to the
browser's normal cache. Its main operation is conceptually:

```ts
loadIcons(requests, { signal }): Promise<IconLoadResult>
```

An IndexedDB cache can be added later by implementing the core cache interface,
without changing playground or renderer APIs.

### `@archlex/icons-node`

This package configures `icons-core` with Node's fetch implementation and the
existing filesystem cache. It owns environment-variable configuration, cache
directories, TTL behavior, and stale-cache fallback. It becomes the supported
Node entry point instead of exposing Node-only dependencies from a package that
appears browser-compatible.

### Provider packages

`@archlex/aws` and `@archlex/gcp` continue to expose their bundled sanitized
manifests synchronously. They also export browser-safe provider definitions and
CDN name mappings as data. Provider registration must be explicit; importing a
provider package must not register a loader through a side effect.

### `@archlex/core`

Core accepts an `IconRegistry` or equivalent read-only icon map during graph
construction or rendering. It exposes a preparation step that parses and
resolves the source and reports the icon requests required by the diagram.
Prepared diagrams can then be rendered without parsing twice.

A representative API is:

```ts
const prepared = archlex.prepare(source);
const loaded = await iconLoader.loadIcons(prepared.iconRequests, { signal });
const result = archlex.renderPrepared(prepared, {
  icons: loaded.icons,
  theme,
});
```

Exact names may follow existing code conventions, but the prepare/load/render
separation is required.

## Resolution and Rendering Flow

1. Parse and resolve the diagram into a prepared representation.
2. Collect unique `{ provider, key }` icon requests.
3. Resolve bundled icons immediately.
4. Resolve missing icons in parallel through the selected runtime adapter.
5. Deduplicate requests and enforce a small configurable concurrency limit.
6. Validate and sanitize every fetched SVG.
7. Store valid icon records in the runtime cache and application memory.
8. Substitute a bundled generic icon for unresolved or rejected records.
9. Render the prepared diagram synchronously with the completed registry.

The playground maintains the last successful diagram while a new request is in
flight. Each edit aborts the obsolete batch. Results also carry an operation ID
so a late response cannot replace a newer render even if cancellation races with
network completion.

## CDN and Caching Requirements

- CDN URLs must use HTTPS and match an explicit provider allowlist.
- Production URLs must be version-pinned or content-addressed, never use a
  moving tag such as `latest`.
- Selected CDNs must provide browser-compatible CORS headers.
- Fetches must set a payload-size limit and a timeout.
- The browser adapter uses normal browser HTTP caching plus application-memory
  caching in the first version.
- The browser keeps a short-lived in-memory negative cache for missing or
  rejected icons to prevent repeated requests during editing.
- The Node adapter preserves filesystem TTL and stale-cache behavior.
- Only sanitized icon records may enter an application or persistent cache.

## Diagnostics and Failure Behavior

Icon failures are non-fatal. A timeout, cancellation, CORS or network failure,
HTTP error, invalid SVG, oversized response, checksum error, or unknown mapping
produces a structured icon diagnostic and a generic sanitized fallback.

Expected cancellation caused by a new edit is not shown as an error. Other icon
diagnostics can appear as warnings in playground status details without being
mixed with semantic graph-validation diagnostics.

A complete diagram render must remain possible when the network is unavailable.

## VS Code Integration

The future VS Code package uses `@archlex/icons-node` in the extension host. The
host fetches, sanitizes, and caches icons, then sends only serializable sanitized
records to the webview:

```ts
{
  provider,
  key,
  checksum,
  viewBox,
  svgFragment,
}
```

The webview passes these records to the same synchronous renderer integration
used by the playground. It does not access the CDN or filesystem, which avoids
webview CORS and content-security-policy dependencies.

## Security

- Treat every CDN response as untrusted input.
- Sanitize before registry insertion, rendering, or caching.
- Reject scripts, event attributes, external references, unsafe URLs, DTDs,
  entities, and responses exceeding configured limits.
- Retain the existing SVG security behavior as a shared contract test.
- Use Web Crypto for cross-runtime SHA-256 checksums.
- Do not interpolate arbitrary user input into hostnames or base URLs.
- Keep CDN base configuration controlled by provider definitions or trusted
  Node configuration.

## Testing Strategy

### Core contract tests

- URL candidate and mapping behavior.
- Sanitizer rejection and normalization behavior.
- Stable checksums for the same sanitized SVG.
- Request deduplication and concurrency limits.
- Generic fallback and structured diagnostics.
- Oversized, malformed, and hostile SVG inputs.

### Browser adapter tests

- Successful fetch and in-memory reuse.
- HTTP errors, network failures, timeout, and CORS-equivalent fetch rejection.
- Cancellation and stale-operation protection during rapid source edits.
- Negative caching of repeated missing icons.
- A production bundle assertion that no `node:*` import or `process.env`
  reference is reachable from browser entry points.
- Successful static playground production build.

### Node adapter tests

- Filesystem cache hits, expiry, atomic writes, and stale-cache fallback.
- Environment configuration confined to the Node adapter.
- Equivalent sanitized records from Node and browser adapters for the same
  response fixture.

### Integration tests

- Diagrams containing only bundled icons.
- Diagrams containing only fetched icons.
- Mixed bundled, fetched, and fallback icons.
- Several nodes requesting the same icon concurrently.
- Network failure without whole-diagram failure.
- Future extension-host-to-webview serialization and rendering.

## Migration Sequence

1. Extract browser-safe types, sanitization, provider behavior, and loader
   orchestration into `icons-core` while preserving Node behavior.
2. Move filesystem and environment concerns into `icons-node`.
3. Export explicit provider definitions from AWS and GCP packages.
4. Add the prepare/icon-registry/render integration to core.
5. Add `icons-browser` and integrate it into the playground.
6. Verify browser bundle boundaries and all cross-runtime contract tests.
7. Build the VS Code adapter/package later on the same contracts.

## Acceptance Criteria

- The static playground renders an icon that is absent from its bundled
  manifest by loading it directly from an approved CDN.
- A CDN outage or invalid icon never prevents the diagram from rendering.
- Browser production output contains no Node runtime dependencies.
- Repeated icon references share one in-flight request.
- A stale icon response cannot overwrite a newer editor render.
- Node consumers retain persistent filesystem caching.
- Browser and Node adapters return equivalent sanitized icon records for the
  same source SVG.
- The design supports a VS Code extension host without requiring CDN access
  from its webview.
