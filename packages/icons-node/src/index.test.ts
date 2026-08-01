import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CdnProviderDefinition,
  FetchIcon,
  SanitizedIcon,
} from "@archlex/icons-core";
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
    const cache = new CacheManager({ cacheDir, ttlDays: -1 });
    const request = { provider: "aws", key: "lambda" };

    await cache.set(request, EXPECTED_ICON, "https://icons.test/v1/lambda.svg");

    await expect(cache.get(request)).resolves.toBeUndefined();
    await expect(cache.get(request, { allowExpired: true })).resolves.toEqual(
      EXPECTED_ICON,
    );
    const files = await readdir(join(cacheDir, "aws"));
    expect(files).toEqual([`lambda-${EXPECTED_ICON.checksum}.json`]);
    const entry = JSON.parse(
      await readFile(join(cacheDir, "aws", files[0]), "utf8"),
    );
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
});
