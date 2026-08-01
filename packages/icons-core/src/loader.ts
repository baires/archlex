import { GENERIC_CLOUD_ICON_SVG } from "./fallback.js";
import { CdnProviderError, createCdnProvider } from "./provider.js";
import { sanitizeSvg } from "./sanitizer.js";
import type {
  CdnProvider,
  CreateIconLoaderOptions,
  IconDiagnostic,
  IconLoadResult,
  IconLoader,
  IconRequest,
  SanitizedIcon,
} from "./types.js";

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_NEGATIVE_CACHE_MS = 30_000;

export function createIconLoader(options: CreateIconLoaderOptions): IconLoader {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const negativeCacheMs = options.negativeCacheMs ?? DEFAULT_NEGATIVE_CACHE_MS;
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new Error("concurrency must be a positive integer");
  }
  if (!Number.isSafeInteger(negativeCacheMs) || negativeCacheMs < 0) {
    throw new Error("negativeCacheMs must be a non-negative integer");
  }

  const providers = new Map<string, CdnProvider>();
  for (const definition of options.providers) {
    if (providers.has(definition.provider)) {
      throw new Error(`Duplicate icon provider: ${definition.provider}`);
    }
    providers.set(
      definition.provider,
      createCdnProvider(definition, options.fetchFn),
    );
  }

  const semaphore = new FifoSemaphore(concurrency);
  const memory = new Map<string, SanitizedIcon>();
  const inFlight = new Map<string, Promise<SanitizedIcon>>();
  const negativeCache = new Map<string, number>();

  return {
    async loadIcons(requests, loadOptions = {}): Promise<IconLoadResult> {
      if (loadOptions.signal?.aborted) throw abortError();
      const icons = new Map<string, SanitizedIcon>();
      const diagnostics: IconDiagnostic[] = [];
      const uniqueRequests = deduplicateRequests(requests);

      const outcomes = await Promise.all(
        uniqueRequests.map(async (request) => {
          const id = requestId(request);
          try {
            const icon = await loadIcon(request, loadOptions.signal);
            return { id, icon };
          } catch (error) {
            if (isAbortError(error)) throw error;
            const diagnostic = toDiagnostic(request, error);
            if (
              negativeCacheMs > 0 &&
              diagnostic.code !== "ICON_FETCH_FAILED"
            ) {
              negativeCache.set(id, Date.now() + negativeCacheMs);
            }

            const expired = await getCached(request, true);
            if (expired) {
              return { id, icon: expired, diagnostic };
            }
            const icon = await sanitizeSvg(
              request.provider,
              request.key,
              GENERIC_CLOUD_ICON_SVG,
            );
            return { id, icon, diagnostic };
          }
        }),
      );

      for (const outcome of outcomes) {
        icons.set(outcome.id, outcome.icon);
        if (outcome.diagnostic) diagnostics.push(outcome.diagnostic);
      }

      return { icons, diagnostics };
    },
  };

  async function loadIcon(
    request: IconRequest,
    signal?: AbortSignal,
  ): Promise<SanitizedIcon> {
    const id = requestId(request);
    const memoryIcon = memory.get(id);
    if (memoryIcon) return memoryIcon;

    const cached = await getCached(request, false);
    if (cached) {
      memory.set(id, cached);
      return cached;
    }

    if ((negativeCache.get(id) ?? 0) > Date.now()) {
      throw new CdnProviderError(
        "ICON_UNMAPPED",
        `Icon ${request.provider}/${request.key} is temporarily unavailable`,
      );
    }
    negativeCache.delete(id);

    const pending = inFlight.get(id);
    if (pending) return waitForPromise(pending, signal);

    const created = fetchAndSanitize(request, signal);
    inFlight.set(id, created);
    const removeAbortedRequest = () => {
      if (inFlight.get(id) === created) inFlight.delete(id);
    };
    signal?.addEventListener("abort", removeAbortedRequest, { once: true });
    void created
      .finally(() => {
        signal?.removeEventListener("abort", removeAbortedRequest);
        if (inFlight.get(id) === created) inFlight.delete(id);
      })
      .catch(() => undefined);
    return waitForPromise(created, signal);
  }

  async function fetchAndSanitize(
    request: IconRequest,
    signal?: AbortSignal,
  ): Promise<SanitizedIcon> {
    const provider = providers.get(request.provider);
    if (!provider) {
      throw new CdnProviderError(
        "ICON_UNMAPPED",
        `No CDN provider is registered for ${request.provider}`,
      );
    }

    const release = await semaphore.acquire(signal);
    try {
      const fetched = await provider.fetchIcon(request.key, { signal });
      if (!fetched) {
        throw new CdnProviderError(
          "ICON_UNMAPPED",
          `No CDN icon was found for ${request.provider}/${request.key}`,
        );
      }
      let icon: SanitizedIcon;
      try {
        icon = await sanitizeSvg(
          request.provider,
          request.key,
          fetched.rawSvg,
          { maxBytes: provider.definition.maxResponseBytes },
        );
      } catch (error) {
        throw new CdnProviderError(
          "ICON_INVALID",
          `Invalid SVG for ${request.provider}/${request.key}: ${errorMessage(error)}`,
        );
      }
      memory.set(requestId(request), icon);
      try {
        await options.cache?.set(request, icon, fetched.source);
      } catch {
        // A valid icon remains usable when an optional runtime cache cannot write.
      }
      return icon;
    } finally {
      release();
    }
  }

  async function getCached(
    request: IconRequest,
    allowExpired: boolean,
  ): Promise<SanitizedIcon | undefined> {
    try {
      return await options.cache?.get(
        request,
        allowExpired ? { allowExpired: true } : undefined,
      );
    } catch {
      return undefined;
    }
  }
}

class FifoSemaphore {
  private active = 0;
  private readonly queue: Array<{
    resolve: (release: () => void) => void;
    reject: (error: DOMException) => void;
    signal?: AbortSignal;
    abort?: () => void;
  }> = [];

  constructor(private readonly maximum: number) {}

  acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(abortError());
    if (this.active < this.maximum) {
      this.active += 1;
      return Promise.resolve(this.createRelease());
    }

    return new Promise((resolve, reject) => {
      const entry: (typeof this.queue)[number] = { resolve, reject, signal };
      entry.abort = () => {
        const index = this.queue.indexOf(entry);
        if (index >= 0) this.queue.splice(index, 1);
        reject(abortError());
      };
      signal?.addEventListener("abort", entry.abort, { once: true });
      this.queue.push(entry);
    });
  }

  private createRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.queue.shift();
      if (next) {
        if (next.abort) {
          next.signal?.removeEventListener("abort", next.abort);
        }
        next.resolve(this.createRelease());
      } else {
        this.active -= 1;
      }
    };
  }
}

function deduplicateRequests(
  requests: readonly IconRequest[],
): readonly IconRequest[] {
  const unique = new Map<string, IconRequest>();
  for (const request of requests) {
    const id = requestId(request);
    if (!unique.has(id)) unique.set(id, request);
  }
  return Array.from(unique.values());
}

function requestId(request: IconRequest): string {
  return `${request.provider}:${request.key}`;
}

function toDiagnostic(request: IconRequest, error: unknown): IconDiagnostic {
  return {
    provider: request.provider,
    key: request.key,
    code: error instanceof CdnProviderError ? error.code : "ICON_FETCH_FAILED",
    message: errorMessage(error),
  };
}

function waitForPromise<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(abortError());
    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", handleAbort);
    });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted", "AbortError");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
