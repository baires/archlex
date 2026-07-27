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
import {
  PROTOCOL_VERSION,
  type WorkerLayoutRequest,
  type WorkerLayoutResponse,
} from "./worker/index.js";

export * from "./adapter/index.js";
export * from "./worker/index.js";

let requestIdCounter = 0;

interface ELKLike {
  layout(graph: unknown): Promise<unknown>;
}

export function createInlineLayoutEngine(): LayoutEngine {
  const elkCtor = ((ELK as unknown as { default: new () => ELKLike }).default ||
    ELK) as unknown as new () => ELKLike;
  const elk = new elkCtor();

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

      try {
        const elkGraph = buildElkGraph(graph, options?.direction);
        const elkResult = (await elk.layout(elkGraph)) as ElkLayoutResult;

        if (options?.signal?.aborted) {
          throw new CloudMerAbortError("Layout aborted after calculation");
        }

        const layoutGraph = convertElkResultToLayoutGraph(elkResult);
        const durationMs = performance.now() - startTime;

        return {
          graph: layoutGraph,
          diagnostics: [],
          metadata: {
            engine: "elk-inline",
            fingerprint: `elk-${graph.nodes.length}-${graph.edges.length}-${options?.direction ?? "LR"}`,
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

      const requestId = ++requestIdCounter;
      const worker = workerFactory();

      return new Promise<LayoutResult>((resolve, reject) => {
        const onAbort = () => {
          worker.terminate();
          reject(new CloudMerAbortError("Layout worker aborted by caller"));
        };

        if (options?.signal) {
          options.signal.addEventListener("abort", onAbort, { once: true });
        }

        worker.onmessage = (event: MessageEvent<WorkerLayoutResponse>) => {
          if (options?.signal) {
            options.signal.removeEventListener("abort", onAbort);
          }
          worker.terminate();

          const data = event.data;
          if (data.requestId !== requestId) return;

          if (data.error) {
            reject(new CloudMerInternalError("layout", data.error));
          } else if (data.result) {
            resolve(data.result);
          }
        };

        worker.onerror = (err) => {
          if (options?.signal) {
            options.signal.removeEventListener("abort", onAbort);
          }
          worker.terminate();
          reject(new CloudMerInternalError("layout", "Worker error", err));
        };

        const msg: WorkerLayoutRequest = {
          protocolVersion: PROTOCOL_VERSION,
          requestId,
          graph,
          options,
        };

        worker.postMessage(msg);
      });
    },
  };
}
