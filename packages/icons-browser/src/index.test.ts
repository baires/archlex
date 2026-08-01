import type {
  CdnProviderDefinition,
  FetchIcon,
  SanitizedIcon,
} from "@archlex/icons-core";
import { describe, expect, it, vi } from "vitest";
import { createBrowserIconLoader } from "./index.js";
import { MemoryIconCache } from "./memory-cache.js";

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

describe("createBrowserIconLoader", () => {
  it("returns the cross-runtime record and reuses it in memory", async () => {
    const fetchFn: FetchIcon = vi.fn(async () => new Response(SAFE_SVG));
    const loader = createBrowserIconLoader({
      providers: [PROVIDER],
      fetchFn,
    });

    const first = await loader.loadIcons([{ provider: "aws", key: "lambda" }]);
    const second = await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(first.icons.get("aws:lambda")).toEqual(EXPECTED_ICON);
    expect(second.icons.get("aws:lambda")).toEqual(EXPECTED_ICON);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("MemoryIconCache", () => {
  it("stores sanitized icons by provider and key", async () => {
    const cache = new MemoryIconCache();
    const request = { provider: "aws", key: "lambda" };

    await cache.set(request, EXPECTED_ICON, "https://icons.test/v1/lambda.svg");

    await expect(cache.get(request)).resolves.toEqual(EXPECTED_ICON);
    await expect(
      cache.get({ provider: "gcp", key: "lambda" }),
    ).resolves.toBeUndefined();
  });
});
