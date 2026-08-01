# Dynamic CDN Icon Loading Design

**Date:** 2026-08-01  
**Status:** Approved  
**Author:** AI Assistant

## Overview

Add dynamic CDN-based icon loading to support all 200+ AWS and 100+ GCP services without increasing bundle size. Currently only 21 icons per provider are bundled, covering ~11% of services. This design enables on-demand loading of official provider icons from CDN sources with full security sanitization and persistent caching.

## Goals

1. Support all AWS and GCP services with official icons via CDN loading
2. Maintain existing security guarantees (rigorous SVG sanitization)
3. Zero bundle size impact (icons loaded on-demand)
4. Fast performance via persistent disk cache (7-day TTL)
5. Graceful fallback when CDN unavailable
6. Configurable CDN sources (especially for GCP, to allow future switching)
7. Proper attribution for third-party icon sources

## Non-Goals

- Replace existing bundled icons (they remain as fast-path)
- Pre-fetch/bundle all icons at build time
- Support non-official/custom icons (out of scope)
- Real-time icon updates (7-day cache is intentional)

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    @archlex/icons (NEW)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ IconLoader   │  │ CDN Provider │  │ Sanitizer    │      │
│  │ (orchestrate)│  │ (fetch)      │  │ (security)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────┐      │
│  │        CacheManager (disk, TTL, cleanup)         │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
           ▲                           ▲
           │                           │
    ┌──────┴──────┐           ┌───────┴────────┐
    │ @archlex/aws│           │  @archlex/gcp  │
    │             │           │                │
    │ - CDN config│           │  - CDN config  │
    │ - Mappings  │           │  - Mappings    │
    └─────────────┘           └────────────────┘
```

### Component Responsibilities

**IconLoader (Core Orchestrator)**
- Entry point: `IconLoader.get(provider, iconKey) => SanitizedIcon | undefined`
- Resolution order: bundled icons → cache → CDN fetch → sanitize → cache write
- Manages provider registry and statistics

**CDN Providers**
- `CdnProvider` interface: `fetch(iconKey: string) => Promise<string>`
- `AwsCdnProvider`: Fetches from `https://unpkg.com/aws-icons@latest/icons/{name}.svg`
- `GcpCdnProvider`: Fetches from `https://icon.icepanel.io/GCP/svg/{Name}.svg`
- Handles name mapping and fallback transformations

**Sanitizer**
- Extracts and reuses existing sanitization logic from `import-official-icons.mjs`
- Parses SVG with `@xmldom/xmldom`
- Validates structure, rejects active content (scripts, external refs, event handlers)
- Returns `SanitizedIcon` type with checksum

**CacheManager**
- Persistent cache at `~/.cache/archlex/icons/{provider}/{iconKey}-{checksum}.json`
- 7-day TTL per entry
- Atomic writes (temp + rename)
- Automatic cleanup of expired entries
- Grace period: use expired cache if CDN fails

## CDN Configuration

### AWS Configuration

```typescript
{
  provider: 'aws',
  name: 'aws-icons-npm',
  baseUrl: 'https://unpkg.com/aws-icons@latest/icons',
  fileExtension: '.svg',
  attribution: {
    source: 'aws-icons npm package',
    license: 'Apache-2.0',
    url: 'https://www.npmjs.com/package/aws-icons'
  }
}
```

### GCP Configuration

```typescript
{
  provider: 'gcp',
  name: 'icepanel-gcp',
  baseUrl: 'https://icon.icepanel.io/GCP/svg',
  fileExtension: '.svg',
  attribution: {
    source: 'IcePanel GCP Icons',
    license: 'Community maintained',
    url: 'https://gcpicons.com/'
  }
}
```

**Note:** GCP CDN URL is configurable via `ARCHLEX_GCP_ICON_CDN_URL` environment variable to allow future switching.

## Icon Name Mapping

### Explicit Mappings

Each provider maintains a mapping table from service ID to CDN icon name:

```typescript
// AWS (kebab-case → kebab-case, mostly 1:1)
{
  'lambda': 'lambda',
  's3': 's3',
  'api-gateway': 'api-gateway',
  // ...
}

// GCP (kebab-case → PascalCase)
{
  'cloud-functions': 'CloudFunctions',
  'bigquery': 'BigQuery',
  'cloud-run': 'CloudRun',
  // ...
}
```

### Fallback Transformations

When explicit mapping not found, try in order:
1. Original name (`cloud-functions`)
2. PascalCase (`CloudFunctions`)
3. camelCase (`cloudFunctions`)
4. lowercase no-dashes (`cloudfunctions`)

Stop at first successful fetch (HTTP 200).

### Generic Fallback

If all CDN attempts fail, use a bundled generic cloud service icon (simple cloud shape SVG in `@archlex/icons` package).

## Sanitization & Security

### Pipeline

1. **Parse:** Use `@xmldom/xmldom` to parse SVG XML
2. **Validate Structure:**
   - Reject DOCTYPE, entity declarations, processing instructions
   - Require root `<svg>` element with valid `viewBox`
3. **Sanitize Content:**
   - Allowlist safe elements: `path`, `circle`, `rect`, `g`, `defs`, `linearGradient`, `filter`, etc.
   - Allowlist safe attributes: no `onload`, `onclick`, `style`, etc.
   - Strip external references: no `http://`, `data:`, `javascript:` protocols
   - Allow only fragment IRI references (`#id` within same document)
4. **GCP-Specific:** Inline CSS styles (convert `<style>` blocks to attributes, then remove)
5. **Serialize:** Canonical serialization with sorted attributes
6. **Checksum:** Generate SHA-256 of sanitized output

### Security Guarantees

- Never trust CDN content - always sanitize before caching
- Same rigorous validation as build-time bundled icons
- Rejects any SVG with active content
- Validates structure before processing (prevents XXE, billion laughs attacks)

### Error Handling

- Sanitization failures treated as "icon not found"
- Logged as warnings with details for debugging
- Process never crashes due to malicious SVG

## Caching Strategy

### Cache Directory Structure

```
~/.cache/archlex/icons/
├── aws/
│   ├── lambda-abc123def456.json
│   ├── s3-789012ghi345.json
│   └── ...
├── gcp/
│   ├── cloud-functions-jkl678mno901.json
│   ├── bigquery-pqr234stu567.json
│   └── ...
└── metadata.json
```

### Cache Entry Format

```json
{
  "key": "lambda",
  "provider": "aws",
  "checksum": "abc123def456...",
  "viewBox": "0 0 64 64",
  "svgFragment": "<svg>...</svg>",
  "cachedAt": "2026-08-01T10:30:00Z",
  "expiresAt": "2026-08-08T10:30:00Z",
  "cdnSource": "https://unpkg.com/aws-icons@latest/icons/lambda.svg"
}
```

### Cache Lifecycle

1. **Lookup:** Check if `{provider}/{iconKey}-{checksum}.json` exists and not expired
2. **Hit:** Return cached `SanitizedIcon` immediately
3. **Miss/Expired:** Fetch from CDN, sanitize, write to cache
4. **Write:** Atomic write (temp file + rename) to prevent corruption
5. **Cleanup:** Remove expired entries on startup or every 100 requests

### TTL & Expiration

- Default TTL: 7 days (configurable via `ARCHLEX_ICON_CACHE_TTL`)
- Grace period: If CDN fetch fails and expired cache exists, use expired cache (stale icon better than none)
- Manual invalidation: Delete `~/.cache/archlex/icons/` to force refresh

### Concurrency

- File locking for writes (prevent race conditions)
- Read operations don't require locking (cache entries are immutable)

## Integration with Provider Packages

### Package Dependencies

Add `@archlex/icons` as dependency to both `@archlex/aws` and `@archlex/gcp`:

```json
{
  "dependencies": {
    "@archlex/model": "workspace:^",
    "@archlex/icons": "workspace:^"
  },
  "devDependencies": {
    "@xmldom/xmldom": "0.9.10"
  }
}
```

### Provider Registration

Each provider package registers CDN configuration on module load:

```typescript
// packages/aws/src/icons/cdn.ts (NEW FILE)
import { IconLoader } from '@archlex/icons';

IconLoader.registerProvider('aws', AWS_CDN_CONFIG, AWS_ICON_NAME_MAPPING);
```

### Service Resolution Update

Update existing `resolveService()` method:

```typescript
// packages/aws/src/registry.ts (MODIFIED)
resolveService(serviceKind: string): ServiceMetadata | undefined {
  const def = this.services.get(serviceKind);
  if (!def) return undefined;

  // Try bundled icons first (fast path)
  let iconSvg = def.iconKey ? AWS_SANITIZED_ICONS[def.iconKey]?.svgFragment : undefined;

  // If not bundled, try CDN loader
  if (!iconSvg && def.iconKey) {
    const cdnIcon = IconLoader.get('aws', def.iconKey);
    iconSvg = cdnIcon?.svgFragment;
  }

  return {
    id: def.id,
    displayName: def.displayName,
    iconKey: def.iconKey,
    iconSvg
  };
}
```

### Backward Compatibility

- Existing bundled icons continue to work exactly as before (no changes)
- CDN loading only kicks in for services without bundled icons
- No breaking changes to public APIs
- If CDN loading disabled/fails, diagrams still render (without icons)

## Configuration

### Environment Variables

```bash
# Disable CDN loading entirely (use only bundled icons)
ARCHLEX_DISABLE_CDN_ICONS=true

# Custom cache directory
ARCHLEX_ICON_CACHE_DIR=/custom/path

# Custom TTL (in days)
ARCHLEX_ICON_CACHE_TTL=14

# Custom GCP CDN (for future CDN switching)
ARCHLEX_GCP_ICON_CDN_URL=https://alternative-cdn.com/gcp/svg

# Debug logging
ARCHLEX_DEBUG=icons
```

## Error Handling & Observability

### Error Categories

1. **Network Errors** (CDN unreachable, timeout, 404, 500, etc.)
   - Try fallback name transformations
   - Fall back to generic icon
   - Log warning but don't crash

2. **Sanitization Errors** (malformed SVG, security violations)
   - Treat as "icon not found"
   - Log warning with details

3. **Cache Errors** (disk full, permission denied, corrupted file)
   - Skip cache, fetch directly
   - Log warning but continue

4. **Configuration Errors** (invalid CDN URL, missing provider)
   - Fail fast at initialization time

### Logging

When `ARCHLEX_DEBUG=icons`:
- CDN fetch attempts: `Fetching aws/lambda from https://...`
- Cache hits/misses: `Cache HIT: aws/lambda`
- Sanitization warnings: `Rejected unsafe SVG: aws/unknown (reason)`
- Fallback attempts: `Trying PascalCase transformation for cloud-functions`

### Metrics

```typescript
IconLoader.getStats() => {
  totalRequests: 150,
  bundledHits: 120,
  cacheHits: 25,
  cdnFetches: 5,
  failures: 0,
  byProvider: {
    aws: { requests: 100, cdnFetches: 2, failures: 0 },
    gcp: { requests: 50, cdnFetches: 3, failures: 0 }
  }
}
```

### Attribution API

```typescript
IconLoader.getAttributions() => [
  {
    provider: 'gcp',
    source: 'IcePanel GCP Icons',
    url: 'https://gcpicons.com/',
    iconsUsed: ['CloudFunctions', 'BigQuery', 'CloudRun']
  }
]
```

Allows applications to display proper attribution for third-party icon sources (especially important for icepanel.io).

### Graceful Degradation

- Diagram rendering never fails due to icon issues
- Missing icons = show service label without icon (diagram still works)
- Expired cache + CDN down = use expired cache as fallback
- Critical errors logged but don't crash process

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `@archlex/icons` package
2. Implement `IconLoader` class
3. Implement `CacheManager`
4. Extract sanitization logic into shared module

### Phase 2: CDN Providers
1. Implement `CdnProvider` interface
2. Implement `AwsCdnProvider`
3. Implement `GcpCdnProvider`
4. Add name mapping tables

### Phase 3: Integration
1. Update `@archlex/aws` to register provider and use `IconLoader`
2. Update `@archlex/gcp` to register provider and use `IconLoader`
3. Add generic fallback icon
4. Add environment variable configuration

### Phase 4: Testing & Documentation
1. Unit tests for sanitizer, cache, CDN providers
2. Integration tests for full icon loading flow
3. Update README with CDN loading documentation
4. Add troubleshooting guide

## Testing Strategy

### Unit Tests
- Sanitizer: Test allowlists, rejections, edge cases
- CacheManager: Test TTL, expiration, cleanup, atomicity
- CDN Providers: Test name mapping, fallback transformations
- IconLoader: Test resolution order, error handling

### Integration Tests
- End-to-end: Request icon → CDN fetch → sanitize → cache → retrieve
- Failure scenarios: CDN down, malformed SVG, cache errors
- Concurrent access: Multiple processes accessing cache simultaneously

### Security Tests
- Malicious SVG samples: XSS attempts, external refs, XXE
- Verify sanitizer rejects all attack vectors
- Verify same security as bundled icons

## Success Metrics

- All ~195 AWS services can display official icons
- All ~185 GCP services can display official icons
- Cache hit rate > 90% after warmup
- CDN fetch time < 500ms (p95)
- Zero bundle size increase
- Zero security regressions

## Future Considerations

- Add Azure, Alibaba Cloud, other providers using same infrastructure
- Add icon preview/browser for available icons
- Add bulk pre-warming script for CI/CD environments
- Consider CDN fallback chain (primary CDN → secondary CDN → generic)
- Add telemetry for CDN reliability monitoring
