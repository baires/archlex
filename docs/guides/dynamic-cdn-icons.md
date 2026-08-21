---
title: Dynamic Icon Guide
description: "Load missing AWS, Google Cloud, and Kubernetes diagram icons from the CDN with ArchLex prepare(), browser and Node icon loaders, and sanitized registries."
---

# Dynamic Icon Guide

## When icon loading runs

AWS, Google Cloud, and Kubernetes packages bundle sanitized artwork for common
resources. A prepared graph lists only the missing provider icons.

The renderer never starts a request. Your application chooses a browser or Node
loader, loads the requests, then passes the sanitized registry to core.

## Prepare, load, render

```ts
import { AWS_CDN_PROVIDER } from "@archlex/aws";
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { GCP_CDN_PROVIDER } from "@archlex/gcp";
import { createBrowserIconLoader } from "@archlex/icons-browser";
import { K8S_CDN_PROVIDER } from "@archlex/k8s";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
});

const loader = createBrowserIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER, K8S_CDN_PROVIDER],
});

const prepared = archlex.prepare("provider aws\nlambda > app-runner");
const loaded = await loader.loadIcons(prepared.iconRequests);
const result = await archlex.renderPrepared(prepared, {
  icons: loaded.icons,
});
```

Inspect `loaded.diagnostics` for icon warnings. A failed icon request returns a
generic sanitized fallback, so the diagram can still render.

## Browser behavior

`@archlex/icons-browser` uses `globalThis.fetch` and an in-memory cache. The
browser HTTP cache may also reuse responses. A new application session starts
with an empty application cache.

The playground renders prepared geometry and loads missing icons in parallel.
It shows the base SVG first, then applies hydrated artwork through
`renderPrepared()`. Icon content does not change the layout fingerprint, so the
second render can reuse geometry.

## Node behavior

`@archlex/icons-node` stores checksum-named JSON entries in a filesystem cache:

```ts
import { createNodeIconLoader } from "@archlex/icons-node";

const loader = createNodeIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER, K8S_CDN_PROVIDER],
  cacheDir: "/var/cache/archlex/icons",
  ttlDays: 7,
});
```

After TTL expiry, the loader requests fresh artwork. It can use an expired
sanitized entry when refresh fails.

Node supports these environment variables:

- `ARCHLEX_ICON_CACHE_DIR`
- `ARCHLEX_ICON_CACHE_TTL`
- `ARCHLEX_DISABLE_CDN_ICONS=true`
- `ARCHLEX_DEBUG=icons`

Browser code must not import the Node adapter or read these variables.

## Cancellation

Pass the same `AbortSignal` to loading and rendering:

```ts
const controller = new AbortController();
const loaded = await loader.loadIcons(prepared.iconRequests, {
  signal: controller.signal,
});
const result = await archlex.renderPrepared(prepared, {
  icons: loaded.icons,
  signal: controller.signal,
});
```

Cancellation rejects with `AbortError`. Interactive clients should also ignore
callbacks from operations that no longer own the current source.

## Provider definitions

Each `CdnProviderDefinition` supplies a provider ID, pinned HTTPS base URL,
allowed hosts, immutable release ID, filename mappings, response limits, and
attribution. The loader rejects moving release names, unsafe redirects,
unexpected hosts, oversized responses, and integrity failures.

## Sanitization

The shared sanitizer rejects entity declarations, processing instructions,
scripts, event handlers, external references, unsafe CSS, active animation,
unsupported elements, and invalid namespaces. It calculates a stable SHA-256
checksum before an icon enters a registry or cache.

## Testing

Inject a fixture-backed `fetchFn` in automated tests. Do not depend on AWS,
Google Cloud, Kubernetes, jsDelivr, or package CDNs. Test success, 404 fallback,
timeout, cancellation, redirect rejection, size limits, sanitization, cache
expiry, and request deduplication.
