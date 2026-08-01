import { describe, expect, it, vi } from "vitest";
import { createCdnProvider } from "./provider.js";
import type { CdnProviderDefinition, FetchIcon } from "./types.js";

const definition: CdnProviderDefinition = {
  provider: "aws",
  baseUrl: "https://icons.test/v1",
  allowedHosts: ["icons.test"],
  releaseId: "v1",
  fileExtension: ".svg",
  mappings: { "api-gateway": "MappedName" },
  attribution: {
    source: "Test icons",
    license: "MIT",
    url: "https://icons.test/license",
  },
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
};

describe("createCdnProvider", () => {
  const fetchFn: FetchIcon = vi.fn(
    async () => new Response(null, { status: 404 }),
  );

  it("rejects non-HTTPS base URLs", () => {
    expect(() =>
      createCdnProvider(
        { ...definition, baseUrl: "http://icons.test/v1" },
        fetchFn,
      ),
    ).toThrow("HTTPS");
  });

  it("rejects hosts outside the explicit allowlist", () => {
    expect(() =>
      createCdnProvider(
        { ...definition, baseUrl: "https://evil.test/v1" },
        fetchFn,
      ),
    ).toThrow("allowlist");
  });

  it.each(["latest", "next", "main", "master"])(
    "rejects the moving path segment %s",
    (movingSegment) => {
      expect(() =>
        createCdnProvider(
          {
            ...definition,
            baseUrl: `https://icons.test/${movingSegment}`,
            releaseId: movingSegment,
          },
          fetchFn,
        ),
      ).toThrow("pinned");
    },
  );

  it("rejects encoded and package-tag forms of moving releases", () => {
    expect(() =>
      createCdnProvider(
        {
          ...definition,
          baseUrl: "https://icons.test/package@l%61test/icons",
          integrity: { lambda: "0".repeat(64) },
        },
        fetchFn,
      ),
    ).toThrow("pinned");
  });

  it("rejects definitions without a versioned URL or integrity values", () => {
    expect(() =>
      createCdnProvider(
        {
          ...definition,
          baseUrl: "https://icons.test/assets",
          releaseId: "v1",
        },
        fetchFn,
      ),
    ).toThrow("integrity");
  });

  it("tries mapped, PascalCase, camelCase, and lowercase candidates in order without duplicates", async () => {
    const requestedUrls: string[] = [];
    const provider = createCdnProvider(definition, async (input) => {
      requestedUrls.push(String(input));
      return new Response(null, { status: 404 });
    });

    await expect(provider.fetchIcon("api-gateway")).resolves.toBeUndefined();
    expect(requestedUrls).toEqual([
      "https://icons.test/v1/MappedName.svg",
      "https://icons.test/v1/ApiGateway.svg",
      "https://icons.test/v1/apiGateway.svg",
      "https://icons.test/v1/apigateway.svg",
    ]);
  });

  it("rejects a raw response whose SHA-256 does not match its icon integrity value", async () => {
    const provider = createCdnProvider(
      {
        ...definition,
        baseUrl: "https://icons.test/assets",
        integrity: { lambda: "0".repeat(64) },
      },
      async () =>
        new Response('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'),
    );

    await expect(provider.fetchIcon("lambda")).rejects.toMatchObject({
      code: "ICON_INVALID",
    });
  });

  it("does not fetch an icon without integrity from an unversioned provider", async () => {
    const stableFetch = vi.fn(async () => new Response("untrusted"));
    const provider = createCdnProvider(
      {
        ...definition,
        baseUrl: "https://icons.test/assets",
        integrity: { lambda: "0".repeat(64) },
      },
      stableFetch,
    );

    await expect(provider.fetchIcon("s3")).resolves.toBeUndefined();
    expect(stableFetch).not.toHaveBeenCalled();
  });

  it("rejects responses over the configured byte limit before sanitization", async () => {
    const provider = createCdnProvider(
      { ...definition, maxResponseBytes: 8 },
      async () => new Response("a".repeat(9)),
    );

    await expect(provider.fetchIcon("lambda")).rejects.toMatchObject({
      code: "ICON_TOO_LARGE",
    });
  });

  it("applies the timeout while reading the response body", async () => {
    const provider = createCdnProvider(
      { ...definition, timeoutMs: 10 },
      async (_input, init) =>
        new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener(
                "abort",
                () =>
                  controller.error(new DOMException("Aborted", "AbortError")),
                { once: true },
              );
            },
          }),
        ),
    );

    const outcome = Promise.race([
      provider.fetchIcon("lambda"),
      new Promise<"timeout-missed">((resolve) =>
        setTimeout(() => resolve("timeout-missed"), 50),
      ),
    ]);
    await expect(outcome).rejects.toMatchObject({ code: "ICON_FETCH_FAILED" });
  });
});
