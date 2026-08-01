import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBrowserIconLoader } from "@archlex/icons-browser";
import type {
  CdnProviderDefinition,
  FetchIcon,
  SanitizedIcon,
} from "@archlex/icons-core";
import { createNodeIconLoader } from "@archlex/icons-node";
import { afterEach, describe, expect, it, vi } from "vitest";

const ICON_FIXTURE_URL = new URL(
  "./fixtures/icons/runtime-service.svg",
  import.meta.url,
);

const PROVIDER: CdnProviderDefinition = {
  provider: "fixture",
  baseUrl: "https://icons.test/releases/2026-08-01",
  allowedHosts: ["icons.test"],
  releaseId: "2026-08-01",
  fileExtension: ".svg",
  mappings: { "runtime-service": "runtime-service" },
  attribution: {
    source: "ArchLex test fixtures",
    license: "MIT",
    url: "https://icons.test/license",
  },
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
};

const EXPECTED_RECORD: SanitizedIcon = {
  provider: "fixture",
  key: "runtime-service",
  viewBox: "0 0 24 24",
  svgFragment:
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24z" fill="#123456"/></svg>',
  checksum: "428d9cd03f0bfe687917dc7c4226b7c01e703234e216aa2e65b3701ef9c6970c",
};

const temporaryDirectories: string[] = [];

async function fixtureFetch(): Promise<Response> {
  return new Response(await readFile(ICON_FIXTURE_URL, "utf8"), {
    headers: { "content-type": "image/svg+xml" },
  });
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("cross-runtime icon loading", () => {
  it("produces identical browser and Node records and persists the Node cache", async () => {
    vi.stubEnv("ARCHLEX_DISABLE_CDN_ICONS", "false");
    const cacheDir = await mkdtemp(join(tmpdir(), "archlex-runtime-icons-"));
    temporaryDirectories.push(cacheDir);
    const browserFetch: FetchIcon = vi.fn(fixtureFetch);
    const nodeFetch: FetchIcon = vi.fn(fixtureFetch);
    const request = { provider: "fixture", key: "runtime-service" };

    const browserResult = await createBrowserIconLoader({
      providers: [PROVIDER],
      fetchFn: browserFetch,
    }).loadIcons([request]);
    const nodeResult = await createNodeIconLoader({
      providers: [PROVIDER],
      fetchFn: nodeFetch,
      cacheDir,
    }).loadIcons([request]);
    const browserRecord = browserResult.icons.get("fixture:runtime-service");
    const nodeRecord = nodeResult.icons.get("fixture:runtime-service");

    expect(browserRecord).toEqual(EXPECTED_RECORD);
    expect(nodeRecord).toEqual(EXPECTED_RECORD);
    expect(browserRecord).toEqual(nodeRecord);
    expect(browserFetch).toHaveBeenCalledTimes(1);
    expect(nodeFetch).toHaveBeenCalledTimes(1);

    const cacheMissFetch: FetchIcon = vi.fn(async () => {
      throw new Error("fixture cache should satisfy the reconstructed loader");
    });
    const cachedResult = await createNodeIconLoader({
      providers: [PROVIDER],
      fetchFn: cacheMissFetch,
      cacheDir,
    }).loadIcons([request]);

    expect(cachedResult.icons.get("fixture:runtime-service")).toEqual(
      EXPECTED_RECORD,
    );
    expect(cacheMissFetch).not.toHaveBeenCalled();
  });
});
