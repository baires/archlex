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
    lambda: "lambda",
    "cloud-functions": "CloudFunctions",
  };

  it("fetches SVG with primary mapped name and falls back through transformations", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("CloudFunctions.svg")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              '<svg viewBox="0 0 64 64"><path d="M0 0h10v10H0z"/></svg>',
            ),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const provider = new BaseCdnProvider(config, mappings, {
      fetchFn: mockFetch,
    });
    const result = await provider.fetchIcon("cloud-functions");

    expect(result).toBeDefined();
    expect(result?.nameUsed).toBe("CloudFunctions");
    expect(result?.urlUsed).toBe(
      "https://unpkg.com/aws-icons@latest/icons/CloudFunctions.svg",
    );
    expect(result?.rawSvg).toContain("<svg");
  });

  it("returns undefined if all transformation attempts return 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const provider = new BaseCdnProvider(config, mappings, {
      fetchFn: mockFetch,
    });
    const result = await provider.fetchIcon("non-existent-service");
    expect(result).toBeUndefined();
  });
});
