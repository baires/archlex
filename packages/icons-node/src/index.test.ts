import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CdnProviderDefinition,
  FetchIcon,
  SanitizedIcon,
} from "@archlex/icons-core";
import { sanitizeSvg } from "@archlex/icons-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CacheManager, createNodeIconLoader } from "./index.js";

const SAFE_SVG =
  '<svg viewBox="0 0 24 24"><path fill="#123456" d="M0 0h24v24z"/></svg>';

const EXPECTED_ICON: SanitizedIcon = {
  provider: "aws",
  key: "lambda",
  viewBox: "0 0 24 24",
  svgFragment:
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24z" fill="#123456"/></svg>',
  checksum: "428d9cd03f0bfe687917dc7c4226b7c01e703234e216aa2e65b3701ef9c6970c",
};

const PROVIDER: CdnProviderDefinition = {
  provider: "aws",
  baseUrl: "https://icons.test/v1",
  allowedHosts: ["icons.test"],
  releaseId: "v1",
  fileExtension: ".svg",
  mappings: {},
  attribution: {
    source: "Test icons",
    license: "MIT",
    url: "https://icons.test/license",
  },
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
};

const temporaryDirectories: string[] = [];

async function temporaryCacheDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "archlex-icons-node-"));
  temporaryDirectories.push(directory);
  return directory;
}

function cacheEntry(
  icon: SanitizedIcon,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...icon,
    cachedAt: "2026-08-01T12:00:00.000Z",
    expiresAt: "2026-08-08T12:00:00.000Z",
    cdnSource: `https://icons.test/v1/${icon.key}.svg`,
    ...overrides,
  };
}

async function writeCacheEntry(
  cacheDir: string,
  entry: Record<string, unknown>,
  filenameChecksum = String(entry.checksum),
): Promise<string> {
  const providerDirectory = join(cacheDir, String(entry.provider));
  await mkdir(providerDirectory, { recursive: true });
  const filePath = join(
    providerDirectory,
    `${String(entry.key)}-${filenameChecksum}.json`,
  );
  await writeFile(filePath, JSON.stringify(entry), "utf8");
  return filePath;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("createNodeIconLoader", () => {
  it("returns the cross-runtime record and reuses a filesystem cache across loaders", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const firstFetch: FetchIcon = vi.fn(async () => new Response(SAFE_SVG));
    const firstLoader = createNodeIconLoader({
      providers: [PROVIDER],
      fetchFn: firstFetch,
      cacheDir,
    });

    const first = await firstLoader.loadIcons([
      { provider: "aws", key: "lambda" },
    ]);
    const secondFetch: FetchIcon = vi.fn(async () => {
      throw new Error("filesystem cache was missed");
    });
    const reconstructedLoader = createNodeIconLoader({
      providers: [PROVIDER],
      fetchFn: secondFetch,
      cacheDir,
    });
    const second = await reconstructedLoader.loadIcons([
      { provider: "aws", key: "lambda" },
    ]);

    expect(first.icons.get("aws:lambda")).toEqual(EXPECTED_ICON);
    expect(second.icons.get("aws:lambda")).toEqual(EXPECTED_ICON);
    expect(firstFetch).toHaveBeenCalledTimes(1);
    expect(secondFetch).not.toHaveBeenCalled();
  });

  it("honors ARCHLEX_DISABLE_CDN_ICONS without hiding a fallback result", async () => {
    vi.stubEnv("ARCHLEX_DISABLE_CDN_ICONS", "true");
    const cacheDir = await temporaryCacheDirectory();
    const fetchFn: FetchIcon = vi.fn(async () => new Response(SAFE_SVG));
    const loader = createNodeIconLoader({
      providers: [PROVIDER],
      fetchFn,
      cacheDir,
    });

    const result = await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.icons.get("aws:lambda")).toMatchObject({
      provider: "aws",
      key: "lambda",
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "ICON_UNMAPPED" }),
    ]);
  });
});

describe("CacheManager", () => {
  it("retains checksum filenames and supports expired fallback reads", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const cache = new CacheManager({ cacheDir });
    const request = { provider: "aws", key: "lambda" };

    await cache.set(request, EXPECTED_ICON, "https://icons.test/v1/lambda.svg");
    const files = await readdir(join(cacheDir, "aws"));
    const filePath = join(cacheDir, "aws", files[0]);
    const entry = JSON.parse(await readFile(filePath, "utf8"));
    entry.cachedAt = "2026-07-20T12:00:00.000Z";
    entry.expiresAt = "2026-07-31T12:00:00.000Z";
    await writeFile(filePath, JSON.stringify(entry), "utf8");

    await expect(cache.get(request)).resolves.toBeUndefined();
    await expect(cache.get(request, { allowExpired: true })).resolves.toEqual(
      EXPECTED_ICON,
    );
    expect(files).toEqual([`lambda-${EXPECTED_ICON.checksum}.json`]);
    expect(entry).toMatchObject({
      cdnSource: "https://icons.test/v1/lambda.svg",
      checksum: EXPECTED_ICON.checksum,
    });
  });

  it("does not confuse a key with another key that begins with the same text", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const cache = new CacheManager({ cacheDir });
    const proxyIcon: SanitizedIcon = {
      ...EXPECTED_ICON,
      key: "rds-proxy",
    };

    await cache.set(
      { provider: "aws", key: "rds-proxy" },
      proxyIcon,
      "https://icons.test/v1/rds-proxy.svg",
    );

    await expect(
      cache.get({ provider: "aws", key: "rds" }),
    ).resolves.toBeUndefined();
  });

  it("writes atomically without depending on the OS temporary filesystem", async () => {
    const cacheDir = await temporaryCacheDirectory();
    vi.stubEnv("TMPDIR", join(cacheDir, "missing-os-temp-directory"));
    const cache = new CacheManager({ cacheDir });

    await expect(
      cache.set(
        { provider: "aws", key: "lambda" },
        EXPECTED_ICON,
        "https://icons.test/v1/lambda.svg",
      ),
    ).resolves.toBeUndefined();
    await expect(
      cache.get({ provider: "aws", key: "lambda" }),
    ).resolves.toEqual(EXPECTED_ICON);
  });

  it("selects a fresh sibling when another matching record is expired", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const cache = new CacheManager({ cacheDir });
    const alternate = await sanitizeSvg(
      "aws",
      "lambda",
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
    );
    const [expired, fresh] = [EXPECTED_ICON, alternate].sort((left, right) =>
      left.checksum.localeCompare(right.checksum),
    );
    await writeCacheEntry(
      cacheDir,
      cacheEntry(expired, {
        cachedAt: "2026-07-20T12:00:00.000Z",
        expiresAt: "2026-07-21T12:00:00.000Z",
      }),
    );
    await writeCacheEntry(
      cacheDir,
      cacheEntry(fresh, {
        cachedAt: "2026-08-01T12:00:00.000Z",
        expiresAt: "2099-08-08T12:00:00.000Z",
      }),
    );

    await expect(
      cache.get({ provider: "aws", key: "lambda" }),
    ).resolves.toEqual(fresh);
    await expect(
      cache.get({ provider: "aws", key: "lambda" }, { allowExpired: true }),
    ).resolves.toEqual(fresh);
  });

  it("skips a corrupt matching record and returns a valid sibling", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const cache = new CacheManager({ cacheDir });
    const providerDirectory = join(cacheDir, "aws");
    await mkdir(providerDirectory, { recursive: true });
    await writeFile(
      join(providerDirectory, `lambda-${"0".repeat(64)}.json`),
      "{not-json",
      "utf8",
    );
    await writeCacheEntry(
      cacheDir,
      cacheEntry(EXPECTED_ICON, { expiresAt: "2099-08-08T12:00:00.000Z" }),
    );

    await expect(
      cache.get({ provider: "aws", key: "lambda" }),
    ).resolves.toEqual(EXPECTED_ICON);
  });

  it("selects the newest fresh record, or newest expired record when explicitly allowed", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const cache = new CacheManager({ cacheDir });
    const alternate = await sanitizeSvg(
      "aws",
      "lambda",
      '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>',
    );
    await writeCacheEntry(
      cacheDir,
      cacheEntry(EXPECTED_ICON, {
        cachedAt: "2026-07-20T12:00:00.000Z",
        expiresAt: "2099-07-20T12:00:00.000Z",
      }),
    );
    await writeCacheEntry(
      cacheDir,
      cacheEntry(alternate, {
        cachedAt: "2026-08-01T12:00:00.000Z",
        expiresAt: "2099-08-01T12:00:00.000Z",
      }),
    );

    await expect(
      cache.get({ provider: "aws", key: "lambda" }),
    ).resolves.toEqual(alternate);

    const expiredCacheDir = await temporaryCacheDirectory();
    const expiredCache = new CacheManager({ cacheDir: expiredCacheDir });
    await writeCacheEntry(
      expiredCacheDir,
      cacheEntry(EXPECTED_ICON, {
        cachedAt: "2026-07-10T12:00:00.000Z",
        expiresAt: "2026-07-11T12:00:00.000Z",
      }),
    );
    await writeCacheEntry(
      expiredCacheDir,
      cacheEntry(alternate, {
        cachedAt: "2026-07-20T12:00:00.000Z",
        expiresAt: "2026-07-21T12:00:00.000Z",
      }),
    );

    await expect(
      expiredCache.get(
        { provider: "aws", key: "lambda" },
        { allowExpired: true },
      ),
    ).resolves.toEqual(alternate);
  });

  it.each([
    ["a malformed field", { viewBox: 42 }, EXPECTED_ICON.checksum],
    ["a filename digest mismatch", {}, "0".repeat(64)],
    [
      "an invalid timestamp",
      { cachedAt: "not-a-date" },
      EXPECTED_ICON.checksum,
    ],
    [
      "active SVG content",
      {
        svgFragment: '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      },
      EXPECTED_ICON.checksum,
    ],
    [
      "checksum-preserving SVG tampering",
      {
        svgFragment:
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
      },
      EXPECTED_ICON.checksum,
    ],
  ])(
    "rejects persisted records containing %s",
    async (_label, overrides, digest) => {
      const cacheDir = await temporaryCacheDirectory();
      const cache = new CacheManager({ cacheDir });
      await writeCacheEntry(
        cacheDir,
        cacheEntry(EXPECTED_ICON, {
          expiresAt: "2099-08-08T12:00:00.000Z",
          ...overrides,
        }),
        digest,
      );

      await expect(
        cache.get({ provider: "aws", key: "lambda" }, { allowExpired: true }),
      ).resolves.toBeUndefined();
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 1e300])(
    "falls back to seven days for an invalid ttlDays value: %s",
    async (ttlDays) => {
      const cacheDir = await temporaryCacheDirectory();
      const cache = new CacheManager({ cacheDir, ttlDays });
      await cache.set(
        { provider: "aws", key: "lambda" },
        EXPECTED_ICON,
        "https://icons.test/v1/lambda.svg",
      );
      const [file] = await readdir(join(cacheDir, "aws"));
      const entry = JSON.parse(
        await readFile(join(cacheDir, "aws", file), "utf8"),
      );

      expect(Date.parse(entry.expiresAt) - Date.parse(entry.cachedAt)).toBe(
        7 * 24 * 60 * 60 * 1_000,
      );
    },
  );

  it.each(["-1", "not-a-number", "", "1e300"])(
    "falls back to seven days for an invalid environment TTL: %s",
    async (environmentTtl) => {
      vi.stubEnv("ARCHLEX_ICON_CACHE_TTL", environmentTtl);
      const cacheDir = await temporaryCacheDirectory();
      const cache = new CacheManager({ cacheDir });
      await cache.set(
        { provider: "aws", key: "lambda" },
        EXPECTED_ICON,
        "https://icons.test/v1/lambda.svg",
      );
      const [file] = await readdir(join(cacheDir, "aws"));
      const entry = JSON.parse(
        await readFile(join(cacheDir, "aws", file), "utf8"),
      );

      expect(Date.parse(entry.expiresAt) - Date.parse(entry.cachedAt)).toBe(
        7 * 24 * 60 * 60 * 1_000,
      );
    },
  );

  it("removes its temporary file when atomic replacement fails", async () => {
    const cacheDir = await temporaryCacheDirectory();
    const providerDirectory = join(cacheDir, "aws");
    await mkdir(
      join(providerDirectory, `lambda-${EXPECTED_ICON.checksum}.json`),
      { recursive: true },
    );
    const cache = new CacheManager({ cacheDir });

    await expect(
      cache.set(
        { provider: "aws", key: "lambda" },
        EXPECTED_ICON,
        "https://icons.test/v1/lambda.svg",
      ),
    ).rejects.toThrow();
    const files = await readdir(providerDirectory);
    expect(files.filter((file) => file.endsWith(".tmp"))).toEqual([]);
  });
});
