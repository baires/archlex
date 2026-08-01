import { describe, expect, expectTypeOf, it, vi } from "vitest";
import * as icons from "./index.js";
import {
  BaseCdnProvider,
  GENERIC_CLOUD_ICON_SVG,
  IconLoader,
  createIconLoader,
  createNodeIconLoader,
  sanitizeSvg,
} from "./index.js";
import type {
  CdnAttribution,
  CdnProviderConfig,
  CdnProviderOptions,
  IconCacheEntry,
  IconStats,
  ProviderAttributionReport,
  SanitizedIcon,
} from "./index.js";

describe("@archlex/icons package initialization", () => {
  it("exports generic cloud icon fallback SVG with valid viewBox", () => {
    expect(GENERIC_CLOUD_ICON_SVG).toContain('<svg viewBox="0 0 64 64"');
  });

  it("exposes the shared core and Node adapter from the package root", () => {
    expect(createIconLoader).toBeTypeOf("function");
    expect(createNodeIconLoader).toBeTypeOf("function");
  });

  it("keeps deprecated synchronous Node imports available during migration", () => {
    expect(IconLoader.reset).toBeTypeOf("function");
    expect(() =>
      sanitizeSvg(
        "aws",
        "unsafe",
        '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      ),
    ).toThrow();
  });

  it("enumerates every legacy runtime and type export at the package root", () => {
    expect(Object.keys(icons)).toEqual(
      expect.arrayContaining([
        "BaseCdnProvider",
        "CacheManager",
        "GENERIC_CLOUD_ICON_SVG",
        "IconLoader",
        "sanitizeSvg",
      ]),
    );
    expectTypeOf<CdnProviderOptions>().toMatchTypeOf<{
      fetchFn?: typeof fetch;
    }>();
    expectTypeOf<CdnAttribution>().toMatchTypeOf<{
      source: string;
      license: string;
      url: string;
    }>();
    expectTypeOf<CdnProviderConfig>().toMatchTypeOf<{
      provider: string;
      name: string;
      baseUrl: string;
      fileExtension: string;
      attribution: CdnAttribution;
    }>();
    expectTypeOf<IconCacheEntry>().toMatchTypeOf<{
      key: string;
      provider: string;
      checksum: string;
      viewBox: string;
      svgFragment: string;
      cachedAt: string;
      expiresAt: string;
      cdnSource: string;
    }>();
    expectTypeOf<IconStats>().toHaveProperty("totalRequests");
    expectTypeOf<ProviderAttributionReport>().toMatchTypeOf<{
      provider: string;
      source: string;
      url: string;
      iconsUsed: readonly string[];
    }>();
    expectTypeOf<SanitizedIcon>().toHaveProperty("svgFragment");
  });

  it("keeps BaseCdnProvider on the original legacy URL contract", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'),
    );
    const provider = new BaseCdnProvider(
      {
        provider: "aws",
        name: "legacy",
        baseUrl: "https://legacy.test/icons",
        fileExtension: ".svg",
        attribution: {
          source: "Legacy",
          license: "MIT",
          url: "https://legacy.test",
        },
      },
      { lambda: "mapped-lambda" },
      { fetchFn },
    );

    await provider.fetchIcon("lambda");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://legacy.test/icons/mapped-lambda.svg",
    );
  });
});
