import type {
  CloudGraph,
  LayoutEngine,
  LayoutOptions,
  LayoutResult,
} from "@cloudmer/model";
import { CloudMerAbortError, CloudMerInternalError } from "@cloudmer/model";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  type ElkLayoutResult,
  buildElkGraph,
  convertElkResultToLayoutGraph,
} from "./adapter/index.js";
import { LayoutCache, computeGeometryFingerprint } from "./cache/index.js";
import {
  PROTOCOL_VERSION,
  createWorkerRequest,
  isStaleResponse,
} from "./worker/index.js";

export * from "./adapter/index.js";
export * from "./cache/index.js";
export * from "./worker/index.js";

interface ELKLike {
  layout(graph: unknown): Promise<unknown>;
}

export function createInlineLayoutEngine(): LayoutEngine {
  const elkCtor = ((ELK as unknown as { default: new () => ELKLike }).default ||
    ELK) as unknown as new () => ELKLike;
  const elk = new elkCtor();
  const cache = new LayoutCache();

  return {
    id: "elk-inline",
    async layout(
      graph: CloudGraph,
      options?: LayoutOptions,
    ): Promise<LayoutResult> {
      const startTime = performance.now();

      if (options?.signal?.aborted) {
        throw new CloudMerAbortError("Layout aborted before execution");
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
        const elkGraph = buildElkGraph(graph, options?.direction);
        const elkResult = (await elk.layout(elkGraph)) as ElkLayoutResult;

        if (options?.signal?.aborted) {
          throw new CloudMerAbortError("Layout aborted after calculation");
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
        if (err instanceof CloudMerAbortError) throw err;
        throw new CloudMerInternalError(
          "layout",
          "ELK layout calculation failed",
          err,
        );
      }
    },
  };
}

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
        throw new CloudMerAbortError("Layout aborted before worker execution");
      }

      const { requestId, request } = createWorkerRequest(graph, options);
      const worker = workerFactory();

      return new Promise<LayoutResult>((resolve, reject) => {
        const onAbort = () => {
          worker.terminate();
          reject(new CloudMerAbortError("Layout worker aborted by caller"));
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
            reject(new CloudMerInternalError("layout", response.error));
          } else if (response.result) {
            resolve(response.result);
          }
        };

        worker.onerror = (err) => {
          if (options?.signal) {
            options.signal.removeEventListener("abort", onAbort);
          }
          worker.terminate();
          reject(new CloudMerInternalError("layout", "Worker error", err));
        };

        worker.postMessage(request);
      });
    },
  };
}
