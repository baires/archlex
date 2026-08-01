# Dynamic CDN Icon Loading

The `@archlex/icons` package provides a production-ready system for dynamically loading cloud service icons from CDN sources with persistent caching, security-hardened sanitization, and comprehensive fallback support.

## Architecture Overview

The dynamic icon loading system consists of four main components:

1. **IconLoader** - Singleton orchestrator managing provider registration and icon resolution
2. **CacheManager** - Persistent disk-based cache with TTL expiration and grace period support
3. **BaseCdnProvider** - CDN provider abstraction with name mapping and fallback transformations
4. **SVG Sanitizer** - Security-hardened validator preventing XSS, XXE, and active content injection

### Resolution Pipeline

```
IconLoader.get(provider, iconKey)
  ↓
1. Check persistent cache (TTL-aware)
  ↓ (cache miss)
2. Fetch from CDN with name transformations
  ↓ (success)
3. Sanitize SVG (security validation)
  ↓
4. Write to persistent cache
  ↓
5. Return sanitized icon

Fallback sequence:
- Expired cache (grace period)
- Generic cloud icon
```

### Name Transformation Strategy

The CDN provider generates candidate names in this order:

1. **Explicit mapping** - `AWS_ICON_NAME_MAPPING["lambda"]` → `"Compute_AWSLambda"`
2. **PascalCase** - `"cloud-functions"` → `"CloudFunctions"`
3. **camelCase** - `"cloud-functions"` → `"cloudFunctions"`
4. **lowercase-no-dashes** - `"cloud-functions"` → `"cloudfunctions"`

This allows matching icons even when the CDN uses different naming conventions.

## Environment Variables

### `ARCHLEX_ICON_CACHE_DIR`

**Default:** `~/.cache/archlex/icons`

Directory where icons are cached persistently. The cache uses atomic file operations (write to temp, then rename) to ensure data integrity.

```bash
export ARCHLEX_ICON_CACHE_DIR=/custom/cache/path
```

### `ARCHLEX_ICON_CACHE_TTL`

**Default:** `7` (days)

Time-to-live for cached icons in days. After expiration, icons are re-fetched from CDN on next request.

```bash
export ARCHLEX_ICON_CACHE_TTL=30
```

### `ARCHLEX_DISABLE_CDN_ICONS`

**Default:** `false`

Completely disable CDN icon loading. When set to `"true"`, only bundled icons will be used.

```bash
export ARCHLEX_DISABLE_CDN_ICONS=true
```

### `ARCHLEX_DEBUG`

**Default:** (not set)

Enable debug logging for icon loading. Set to `"icons"` to see detailed logs.

```bash
export ARCHLEX_DEBUG=icons
```

## Security Model

### SVG Sanitization Guarantees

The sanitizer enforces these security constraints:

1. **No DOCTYPE or entity declarations** - Prevents XXE (XML External Entity) attacks
2. **No processing instructions** - Blocks `<?xml-stylesheet?>` and similar directives
3. **No script elements** - Prevents XSS via `<script>` tags
4. **No event handlers** - Blocks `onclick`, `onload`, etc.
5. **No external references** - Only fragment IRIs allowed (`#id`, `url(#id)`)
6. **Namespace validation** - Only SVG and XLink namespaces permitted
7. **Element allowlist** - Only safe SVG elements (`path`, `circle`, `rect`, etc.)
8. **Attribute allowlist** - Only presentation and structural attributes allowed

### Threat Model

**Protects against:**
- XSS via script injection
- XXE via entity expansion
- Data exfiltration via external references
- Prototype pollution via crafted attributes

**Out of scope:**
- Resource exhaustion (billion laughs attack) - handled by CDN/parser limits
- Timing attacks on cache - cache is local filesystem
- CDN availability - fallback to expired cache or generic icon

## Cache Lifecycle

### Cache Entry Format

Each cache entry is stored as a JSON file:

```json
{
  "provider": "aws",
  "key": "lambda",
  "viewBox": "0 0 64 64",
  "svgFragment": "<path d=\"...\" fill=\"#FF9900\"/>",
  "checksum": "sha256:abc123...",
  "cachedAt": "2026-08-01T10:00:00.000Z",
  "expiresAt": "2026-08-08T10:00:00.000Z",
  "cdnSource": "https://unpkg.com/aws-icons/Compute_AWSLambda.svg"
}
```

### Cache Directory Structure

```
~/.cache/archlex/icons/
├── aws/
│   ├── lambda-abc123.json
│   ├── s3-def456.json
│   └── ...
└── gcp/
    ├── cloud-functions-ghi789.json
    ├── cloud-run-jkl012.json
    └── ...
```

### Manual Cache Operations

**Clear entire cache:**

```bash
rm -rf ~/.cache/archlex/icons
```

**Clear provider-specific cache:**

```bash
rm -rf ~/.cache/archlex/icons/aws
```

**Clear expired entries:**

The cache manager provides a `purgeExpired()` method that can be called programmatically:

```typescript
import { CacheManager } from "@archlex/icons";

const cache = new CacheManager();
await cache.purgeExpired();
```

## Adding Service Icon Mappings

### AWS Provider

Edit `packages/aws/src/icons/cdn.ts`:

```typescript
export const AWS_ICON_NAME_MAPPING: Record<string, string> = {
  lambda: "Compute_AWSLambda",
  s3: "Storage_AmazonSimpleStorageService",
  // Add your new mapping here:
  "new-service": "Category_ServiceName",
};
```

### GCP Provider

Edit `packages/gcp/src/icons/cdn.ts`:

```typescript
export const GCP_ICON_NAME_MAPPING: Record<string, string> = {
  "cloud-functions": "Cloud-Functions",
  "cloud-run": "Cloud-Run",
  // Add your new mapping here:
  "new-service": "ServiceName",
};
```

### Testing New Mappings

1. Clear the cache for that provider: `rm -rf ~/.cache/archlex/icons/aws`
2. Enable debug logging: `export ARCHLEX_DEBUG=icons`
3. Run a test that uses the new service icon
4. Check debug output to see which CDN URLs were attempted
5. Adjust mapping if needed

## Usage Examples

### Basic Icon Loading

```typescript
import { IconLoader } from "@archlex/icons";

const icon = await IconLoader.get("aws", "lambda");
if (icon) {
  console.log(icon.svgFragment); // <path d="..." fill="#FF9900"/>
  console.log(icon.viewBox); // "0 0 64 64"
  console.log(icon.checksum); // "sha256:abc123..."
}
```

### Custom CDN Provider

```typescript
import { IconLoader } from "@archlex/icons";

IconLoader.registerProvider(
  "custom",
  {
    provider: "custom",
    name: "my-icons",
    baseUrl: "https://cdn.example.com/icons",
    fileExtension: ".svg",
    attribution: {
      source: "My Icons",
      license: "MIT",
      url: "https://example.com/icons",
    },
  },
  {
    "service-a": "ServiceA",
    "service-b": "ServiceB",
  },
);

const icon = await IconLoader.get("custom", "service-a");
```

### Metrics and Attribution

```typescript
import { IconLoader } from "@archlex/icons";

// Get usage statistics
const stats = IconLoader.getStats();
console.log(stats.totalRequests); // 42
console.log(stats.cacheHits); // 30
console.log(stats.cdnFetches); // 10
console.log(stats.failures); // 2

// Get attribution for used icons
const attributions = IconLoader.getAttributions();
for (const attr of attributions) {
  console.log(`${attr.provider}: ${attr.source} (${attr.url})`);
  console.log(`  Icons used: ${attr.iconsUsed.join(", ")}`);
}
```

## Browser vs Node.js

The `@archlex/icons` package is **Node.js-only** and cannot run in browser environments due to its dependencies on:
- Node.js filesystem APIs (`fs/promises`)
- Node.js crypto module
- Node.js path and os modules

**In browser environments** (like the playground app):
- Icons are embedded from bundled static manifests (`AWS_SANITIZED_ICONS`, `GCP_SANITIZED_ICONS`)
- CDN loading is not available
- The renderer receives `iconSvg` from `provider.resolveService()` which returns bundled icons only

**In Node.js environments** (like the CLI):
- Bundled icons are used when available (zero network calls)
- CDN loading provides icons not included in the bundle
- Persistent cache avoids repeated CDN fetches

## Performance Characteristics

- **Cache hit:** ~1-2ms (filesystem read + JSON parse)
- **Cache miss (CDN fetch):** 50-200ms (network latency + sanitization)
- **Fallback (expired cache):** ~1-2ms (no network call)
- **Bundle size impact:** Zero - external dependency in Node.js, excluded in browser builds

## Troubleshooting

### Icons not loading from CDN

1. Check debug logs: `ARCHLEX_DEBUG=icons`
2. Verify network access to CDN
3. Check cache permissions: `ls -la ~/.cache/archlex/icons`
4. Try clearing cache: `rm -rf ~/.cache/archlex/icons`

### Sanitization errors

If you see "Safety check failed" errors, the CDN icon violated security constraints. Review the specific error message to understand which constraint failed.

### Cache growing too large

The cache has no automatic size limits. To limit growth:
1. Reduce TTL: `export ARCHLEX_ICON_CACHE_TTL=1`
2. Periodically purge: `rm -rf ~/.cache/archlex/icons`
3. Use `ARCHLEX_DISABLE_CDN_ICONS=true` to rely on bundled icons only
