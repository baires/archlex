import type {
  CloudGraph,
  LayoutEngine,
  LayoutOptions,
  LayoutResult,
} from "@archlex/model";
import { ArchLexAbortError, ArchLexInternalError } from "@archlex/model";
import {
  type ElkLayoutResult,
  buildElkGraph,
  convertElkResultToLayoutGraph,
} from "./adapter/index.js";
import { LayoutCache, computeGeometryFingerprint } from "./cache/index.js";
import { loadElk, preloadElk } from "./elk-loader.js";
import { createWorkerRequest, isStaleResponse } from "./worker/index.js";

export * from "./adapter/index.js";
export * from "./cache/index.js";
export * from "./elk-loader.js";
export * from "./worker/index.js";

/**
 * Creates a lazy-loading inline layout engine.
 * ELK is loaded on first use, reducing initial bundle size.
 */
export function createInlineLayoutEngine(): LayoutEngine {
  const cache = new LayoutCache();

  return {
    id: "elk-inline",
    async layout(
      graph: CloudGraph,
      options?: LayoutOptions,
    ): Promise<LayoutResult> {
      const startTime = performance.now();

      if (options?.signal?.aborted) {
        throw new ArchLexAbortError("Layout aborted before execution");
      }

      const fingerprint = computeGeometryFingerprint(graph, options);
      const cached = cache.get(fingerprint);
      if (cached) {
        return {
          graph: cached,
          diagnostics: [],
          metadata: {
            engine: "elk-inline",
            fingerprint,
            durationMs: 0,
          },
        };
      }

      try {
        // Lazy load ELK on first use
        const elk = await loadElk();

        const elkGraph = buildElkGraph(graph, options?.direction);
        const elkResult = (await elk.layout(elkGraph)) as ElkLayoutResult;

        if (options?.signal?.aborted) {
          throw new ArchLexAbortError("Layout aborted after calculation");
        }

        const layoutGraph = convertElkResultToLayoutGraph(elkResult);
        const durationMs = performance.now() - startTime;

        cache.set(fingerprint, layoutGraph);

        return {
          graph: layoutGraph,
          diagnostics: [],
          metadata: {
            engine: "elk-inline",
            fingerprint,
            durationMs,
          },
        };
      } catch (err: unknown) {
        if (err instanceof ArchLexAbortError) throw err;
        throw new ArchLexInternalError(
          "layout",
          "ELK layout calculation failed",
          err,
        );
      }
    },
  };
}

/**
 * Preloads ELK without blocking.
 * Call this early (e.g., on app mount) to warm up the cache.
 */
export { preloadElk };

export function createWorkerLayoutEngine(
  workerFactory: () => Worker,
): LayoutEngine {
  const inlineFallback = createInlineLayoutEngine();

  return {
    id: "elk-worker",
    async layout(
      graph: CloudGraph,
      options?: LayoutOptions,
    ): Promise<LayoutResult> {
      if (typeof window === "undefined" || typeof Worker === "undefined") {
        return inlineFallback.layout(graph, options);
      }

      if (options?.signal?.aborted) {
        throw new ArchLexAbortError("Layout aborted before worker execution");
      }

      const { requestId, request } = createWorkerRequest(graph, options);
      const worker = workerFactory();

      return new Promise<LayoutResult>((resolve, reject) => {
        const onAbort = () => {
          worker.terminate();
          reject(new ArchLexAbortError("Layout worker aborted by caller"));
        };

        if (options?.signal) {
          options.signal.addEventListener("abort", onAbort, { once: true });
        }

        worker.onmessage = (event) => {
          if (options?.signal) {
            options.signal.removeEventListener("abort", onAbort);
          }
          worker.terminate();

          const response = event.data;
          if (isStaleResponse(response, requestId)) return;

          if (response.error) {
            reject(new ArchLexInternalError("layout", response.error));
          } else if (response.result) {
            resolve(response.result);
          }
        };

        worker.onerror = (err) => {
          if (options?.signal) {
            options.signal.removeEventListener("abort", onAbort);
          }
          worker.terminate();
          reject(new ArchLexInternalError("layout", "Worker error", err));
        };

        worker.postMessage(request);
      });
    },
  };
}
