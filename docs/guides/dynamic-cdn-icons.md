# Dynamic CDN Icon Loading

ArchLex loads missing cloud icons through a shared, browser-safe pipeline. AWS
and GCP still bundle their common icons, while services without bundled artwork
can be fetched, sanitized, and injected before rendering. The final renderer is
synchronous with respect to icons and never starts a network request.

## Runtime packages

- `@archlex/icons-core` owns provider validation, URL candidate resolution,
  bounded fetching, SVG sanitization, checksums, request deduplication,
  concurrency, negative caching, fallbacks, and shared types.
- `@archlex/icons-browser` configures the shared loader with `globalThis.fetch`
  and an in-memory application cache. It imports no Node APIs.
- `@archlex/icons-node` configures the shared loader with a persistent,
  TTL-aware filesystem cache.
- `@archlex/icons` is the deprecated Node compatibility facade. Existing Node
  consumers can migrate incrementally, but new code should choose the explicit
  browser or Node adapter.

Provider packages export pure definitions: `AWS_CDN_PROVIDER` from
`@archlex/aws` and `GCP_CDN_PROVIDER` from `@archlex/gcp`. Importing either
package does not register a loader or perform network work. Each application
must pass the definitions it wants to its runtime adapter.

## Prepare, load, render

Rendering has three explicit phases:

```typescript
import { AWS_CDN_PROVIDER, awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { GCP_CDN_PROVIDER, gcpProvider } from "@archlex/gcp";
import { createBrowserIconLoader } from "@archlex/icons-browser";

const archlex = createArchLex({ providers: [awsProvider(), gcpProvider()] });
const iconLoader = createBrowserIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER],
});

const prepared = archlex.prepare("provider aws\nlambda > app-runner");
const { icons, diagnostics: iconWarnings } =
  await iconLoader.loadIcons(prepared.iconRequests);
const rendered = await archlex.renderPrepared(prepared, { icons });

console.log(rendered.svg);
for (const warning of iconWarnings) {
  console.warn(warning.code, warning.provider, warning.key, warning.message);
}
```

`prepare()` parses and analyzes once, preserving bundled icons and collecting
only missing icon requests. `loadIcons()` deduplicates provider/key pairs,
fetches and sanitizes missing artwork, and returns an immutable registry.
`renderPrepared()` applies that registry without mutating the prepared graph,
then lays out and renders the complete diagram.

Pass an `AbortSignal` to both loading and rendering when work can become stale:

```typescript
const controller = new AbortController();
const prepared = archlex.prepare(source);
const loaded = await iconLoader.loadIcons(prepared.iconRequests, {
  signal: controller.signal,
});
const rendered = await archlex.renderPrepared(prepared, {
  icons: loaded.icons,
  signal: controller.signal,
});
```

Cancellation rejects with `AbortError`; it is not converted into an icon
warning. Interactive consumers must also ignore late success and failure
callbacks from operations that are no longer current.

## Browser and Node usage

Browser applications use the browser adapter:

```typescript
import { createBrowserIconLoader } from "@archlex/icons-browser";

const loader = createBrowserIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER],
  concurrency: 4,
  negativeCacheMs: 30_000,
});
```

The browser adapter keeps sanitized records in application memory. The browser
also applies its ordinary HTTP cache to CDN responses. ArchLex does not use
IndexedDB or a service worker in this release, so creating a new application
session discards the in-memory cache.

Node applications use the Node adapter:

```typescript
import { createNodeIconLoader } from "@archlex/icons-node";

const loader = createNodeIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER],
  cacheDir: "/var/cache/archlex/icons",
  ttlDays: 7,
});
```

The Node adapter writes checksum-named JSON entries atomically. Fresh entries
are shared across loader instances. After TTL expiry, the loader tries the CDN
again and can use the expired sanitized record as a non-fatal fallback when
refreshing fails.

Node-only environment variables remain supported:

- `ARCHLEX_ICON_CACHE_DIR` changes the default cache directory
  (`~/.cache/archlex/icons`).
- `ARCHLEX_ICON_CACHE_TTL` sets the TTL in days.
- `ARCHLEX_DISABLE_CDN_ICONS=true` disables Node CDN requests while preserving
  fallback rendering.
- `ARCHLEX_DEBUG=icons` logs Node adapter fetch decisions.

Browser code must not read these variables or import `@archlex/icons-node`.

## Icon name mappings

The AWS and GCP CDN providers include comprehensive mappings from ArchLex service
identifiers to CDN icon filenames. These mappings handle the naming differences
between ArchLex's kebab-case service IDs and the icon packages' naming conventions.

For example:
- `aurora` → `AmazonAurora.svg`
- `cloudwatch` → `AmazonCloudWatch.svg`
- `kms` → `AWSKeyManagementService.svg`
- `cloud-nat` → `Cloud-NAT.svg`
- `vertex-ai` → `Vertex-AI.svg`

When a service ID has no explicit mapping, the loader tries candidates in order:
explicit mapping, PascalCase, camelCase, then lowercase without dashes. If all
candidates return 404, the loader falls back to a generic cloud icon and emits an
`ICON_UNMAPPED` diagnostic.

The AWS provider includes 100+ mappings covering compute, storage, database,
networking, security, analytics, and ML services. The GCP provider includes 60+
mappings covering similar categories.

## Provider definitions and pinning

Custom providers are explicit data passed to either adapter:

```typescript
import type { CdnProviderDefinition } from "@archlex/icons-core";

export const ACME_CDN_PROVIDER: CdnProviderDefinition = {
  provider: "acme",
  baseUrl: "https://cdn.example.com/acme-icons@2.4.1/svg",
  allowedHosts: ["cdn.example.com"],
  releaseId: "2.4.1",
  fileExtension: ".svg",
  mappings: {
    "service-a": "ServiceA",
  },
  attribution: {
    source: "Acme Architecture Icons",
    license: "Apache-2.0",
    url: "https://example.com/acme-icons",
  },
  timeoutMs: 10_000,
  maxResponseBytes: 256_000,
};
```

Provider URLs must use HTTPS and an explicit hostname allowlist. Releases must
be immutable: pin a version in `baseUrl`, or supply a SHA-256 `integrity` value
for every mapped asset when the upstream URL cannot encode the release. Moving
references such as `latest`, `next`, `main`, and `master` are rejected.

Candidate filenames are tried without duplicates in this order: explicit
mapping, PascalCase, camelCase, then lowercase without dashes. Redirected
responses, unexpected response URLs, oversized payloads, integrity mismatches,
and unsafe SVG content are rejected before cache insertion.

## Failure behavior and warnings

Icon failures are non-fatal. The loader returns a generic sanitized cloud icon
and one structured warning with one of these codes:

- `ICON_FETCH_FAILED`
- `ICON_INVALID`
- `ICON_TOO_LARGE`
- `ICON_UNMAPPED`

The diagram still renders. Icon warnings are intentionally separate from parse,
semantic, layout, and renderer diagnostics, so callers decide where and how to
surface network-related information. A valid expired Node cache entry takes
priority over the generic fallback.

## Security model

Every fetched response is byte-limited before parsing. The sanitizer rejects
DOCTYPE and entity declarations, processing instructions, scripts, event
handlers, external references, unsafe CSS URLs, unsupported elements and
attributes, and invalid namespaces. Sanitized records receive a stable Web
Crypto SHA-256 checksum before they enter a registry or cache.

Bundled icon lookup remains first. Only nodes without bundled SVG artwork become
dynamic requests, and rendering receives sanitized records rather than raw CDN
responses.

## Planned VS Code flow

The planned VS Code integration will run `@archlex/icons-node` in the extension
host, where filesystem caching and network policy belong. The extension host
will send sanitized icon records with prepared diagram data to the webview. The
webview will render those records but will not fetch or sanitize CDN assets
independently.

## Testing and troubleshooting

Tests must inject a `fetchFn` backed by checked-in fixtures; they must never call
the public AWS, GCP, or package CDNs. To diagnose a Node application, enable
`ARCHLEX_DEBUG=icons`, verify the pinned provider URL and allowlist, and inspect
the configured cache directory. A sanitizer or network warning should accompany
a complete fallback diagram rather than aborting the render.
