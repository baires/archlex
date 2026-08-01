import { describe, expect, it, vi } from "vitest";
import { createIconLoader } from "./loader.js";
import type {
  CdnProviderDefinition,
  FetchIcon,
  IconCache,
  SanitizedIcon,
} from "./types.js";

const SAFE_SVG =
  '<svg viewBox="0 0 24 24"><path fill="#123456" d="M0 0h24v24z"/></svg>';

function provider(
  overrides: Partial<CdnProviderDefinition> = {},
): CdnProviderDefinition {
  return {
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
    ...overrides,
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("createIconLoader", () => {
  it("deduplicates the same icon across concurrent batches", async () => {
    const response = deferred<Response>();
    const fetchFn: FetchIcon = vi.fn(() => response.promise);
    const loader = createIconLoader({ providers: [provider()], fetchFn });

    const loads = [
      loader.loadIcons([{ provider: "aws", key: "lambda" }]),
      loader.loadIcons([{ provider: "aws", key: "lambda" }]),
      loader.loadIcons([{ provider: "aws", key: "lambda" }]),
    ];
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    response.resolve(new Response(SAFE_SVG));
    const results = await Promise.all(loads);
    expect(results.every((result) => result.icons.has("aws:lambda"))).toBe(
      true,
    );
  });

  it("never starts more fetches than the configured concurrency", async () => {
    let active = 0;
    let maximumActive = 0;
    const pending: Array<ReturnType<typeof deferred<Response>>> = [];
    const fetchFn: FetchIcon = vi.fn(() => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      const request = deferred<Response>();
      pending.push(request);
      return request.promise.finally(() => {
        active -= 1;
      });
    });
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn,
      concurrency: 2,
    });

    const load = loader.loadIcons([
      { provider: "aws", key: "lambda" },
      { provider: "aws", key: "s3" },
      { provider: "aws", key: "dynamodb" },
    ]);
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[0].resolve(new Response(SAFE_SVG));
    await vi.waitFor(() => expect(pending).toHaveLength(3));
    pending[1].resolve(new Response(SAFE_SVG));
    pending[2].resolve(new Response(SAFE_SVG));

    await load;
    expect(maximumActive).toBe(2);
  });

  it("rejects caller cancellation as AbortError", async () => {
    const fetchFn: FetchIcon = vi.fn(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const loader = createIconLoader({ providers: [provider()], fetchFn });
    const controller = new AbortController();

    const load = loader.loadIcons([{ provider: "aws", key: "lambda" }], {
      signal: controller.signal,
    });
    controller.abort();

    await expect(load).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports malformed SVG as ICON_INVALID and returns a generic fallback", async () => {
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn: async () =>
        new Response('<not-svg viewBox="0 0 24 24"></not-svg>'),
    });

    const result = await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        provider: "aws",
        key: "lambda",
        code: "ICON_INVALID",
      }),
    ]);
    expect(result.icons.get("aws:lambda")).toMatchObject({
      provider: "aws",
      key: "lambda",
      viewBox: "0 0 64 64",
    });
  });

  it("uses the negative cache for two immediate 404 batches", async () => {
    const fetchFn: FetchIcon = vi.fn(
      async () => new Response(null, { status: 404 }),
    );
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn,
      negativeCacheMs: 5_000,
    });

    await loader.loadIcons([{ provider: "aws", key: "lambda" }]);
    const callsAfterFirstBatch = vi.mocked(fetchFn).mock.calls.length;
    await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(callsAfterFirstBatch).toBeGreaterThan(0);
    expect(fetchFn).toHaveBeenCalledTimes(callsAfterFirstBatch);
  });

  it("retries transient HTTP failures instead of negative-caching them", async () => {
    const fetchFn: FetchIcon = vi.fn(
      async () => new Response(null, { status: 503 }),
    );
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn,
      negativeCacheMs: 5_000,
    });

    await loader.loadIcons([{ provider: "aws", key: "lambda" }]);
    const callsAfterFirstBatch = vi.mocked(fetchFn).mock.calls.length;
    await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(fetchFn).toHaveBeenCalledTimes(callsAfterFirstBatch * 2);
  });

  it("does not let an aborted batch poison a replacement batch", async () => {
    const fetchFn: FetchIcon = vi.fn((_input, init) => {
      if (vi.mocked(fetchFn).mock.calls.length > 1) {
        return Promise.resolve(new Response(SAFE_SVG));
      }
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    });
    const loader = createIconLoader({ providers: [provider()], fetchFn });
    const controller = new AbortController();
    const obsolete = loader.loadIcons([{ provider: "aws", key: "lambda" }], {
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    controller.abort();
    const replacement = loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    await expect(obsolete).rejects.toMatchObject({ name: "AbortError" });
    await expect(replacement).resolves.toMatchObject({
      diagnostics: [],
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("keeps a shared fetch alive when only its creator is canceled", async () => {
    const response = deferred<Response>();
    const fetchFn: FetchIcon = vi.fn(
      (_input, init) =>
        new Promise<Response>((resolve, reject) => {
          response.promise.then(resolve, reject);
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const loader = createIconLoader({ providers: [provider()], fetchFn });
    const creatorController = new AbortController();
    const creator = loader.loadIcons([{ provider: "aws", key: "lambda" }], {
      signal: creatorController.signal,
    });
    const joined = loader.loadIcons([{ provider: "aws", key: "lambda" }]);
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    creatorController.abort();
    response.resolve(new Response(SAFE_SVG));

    await expect(creator).rejects.toMatchObject({ name: "AbortError" });
    await expect(joined).resolves.toMatchObject({ diagnostics: [] });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not start a shared fetch when its only waiter cancels first", async () => {
    const fetchFn: FetchIcon = vi.fn(async () => new Response(SAFE_SVG));
    const loader = createIconLoader({ providers: [provider()], fetchFn });
    const controller = new AbortController();

    const load = loader.loadIcons([{ provider: "aws", key: "lambda" }], {
      signal: controller.signal,
    });
    controller.abort();

    await expect(load).rejects.toMatchObject({ name: "AbortError" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("prefers a fresh cache record and never fetches it", async () => {
    const cached: SanitizedIcon = {
      provider: "aws",
      key: "lambda",
      checksum: "a".repeat(64),
      viewBox: "0 0 24 24",
      svgFragment: SAFE_SVG,
    };
    const cache: IconCache = {
      get: vi.fn(async (_request, options) =>
        options?.allowExpired ? undefined : cached,
      ),
      set: vi.fn(async () => undefined),
    };
    const fetchFn: FetchIcon = vi.fn(async () => new Response(SAFE_SVG));
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn,
      cache,
    });

    const result = await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(result.icons.get("aws:lambda")).toBe(cached);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("uses an expired cache record after a CDN failure", async () => {
    const expired: SanitizedIcon = {
      provider: "aws",
      key: "lambda",
      checksum: "b".repeat(64),
      viewBox: "0 0 24 24",
      svgFragment: SAFE_SVG,
    };
    const cache: IconCache = {
      get: vi.fn(async (_request, options) =>
        options?.allowExpired ? expired : undefined,
      ),
      set: vi.fn(async () => undefined),
    };
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn: async () => new Response(null, { status: 503 }),
      cache,
    });

    const result = await loader.loadIcons([{ provider: "aws", key: "lambda" }]);

    expect(result.icons.get("aws:lambda")).toBe(expired);
    expect(result.diagnostics[0]).toMatchObject({ code: "ICON_FETCH_FAILED" });
  });

  it("preserves request order when concurrent failures finish out of order", async () => {
    const response = deferred<Response>();
    const loader = createIconLoader({
      providers: [provider()],
      fetchFn: async () => response.promise,
    });

    const load = loader.loadIcons([
      { provider: "aws", key: "lambda" },
      { provider: "missing", key: "unknown" },
    ]);
    await Promise.resolve();
    response.resolve(new Response('<not-svg viewBox="0 0 24 24"></not-svg>'));
    const result = await load;

    expect(Array.from(result.icons.keys())).toEqual([
      "aws:lambda",
      "missing:unknown",
    ]);
    expect(result.diagnostics.map(({ provider: name }) => name)).toEqual([
      "aws",
      "missing",
    ]);
  });
});
