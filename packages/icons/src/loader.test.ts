import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IconLoader } from "./loader.js";
import type { CdnProviderConfig } from "./types.js";

describe("IconLoader", () => {
  beforeEach(() => {
    // Use unique cache dir per test to avoid cache hits from previous tests
    const uniqueCacheDir = join(
      tmpdir(),
      `archlex-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    process.env.ARCHLEX_ICON_CACHE_DIR = uniqueCacheDir;
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
      text: () =>
        Promise.resolve(
          '<svg viewBox="0 0 64 64"><path d="M0 0h10v10H0z" fill="#000"/></svg>',
        ),
    });

    IconLoader.registerProvider(
      "aws",
      config,
      { lambda: "lambda" },
      { fetchFn: mockFetch },
    );
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
    expect(icon?.svgFragment).toContain('fill="#6B7280"');
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
    process.env.ARCHLEX_DISABLE_CDN_ICONS = undefined;

    expect(icon).toBeUndefined();
  });
});
