import type {
  CloudGraph,
  LayoutEdge,
  LayoutEngine,
  LayoutGraph,
  LayoutNode,
  LayoutOptions,
  LayoutResult,
} from "@cloudmer/model";
import { CloudMerAbortError, CloudMerInternalError } from "@cloudmer/model";
import ELK from "elkjs";

export const PROTOCOL_VERSION = "1.0.0";

export interface WorkerLayoutRequest {
  protocolVersion: typeof PROTOCOL_VERSION;
  requestId: number;
  graph: CloudGraph;
  options?: LayoutOptions;
}

export interface WorkerLayoutResponse {
  protocolVersion: typeof PROTOCOL_VERSION;
  requestId: number;
  result?: LayoutResult;
  error?: string;
}

let requestIdCounter = 0;

export function buildElkGraph(
  graph: CloudGraph,
  direction: "LR" | "RL" | "TB" | "BT" = "LR",
) {
  const elkDirection =
    direction === "LR"
      ? "RIGHT"
      : direction === "RL"
        ? "LEFT"
        : direction === "TB"
          ? "DOWN"
          : "UP";

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection,
      "elk.spacing.nodeNode": "50",
    },
    children: graph.nodes.map((n) => ({
      id: n.id,
      width: 120,
      height: 60,
      labels: [{ text: n.label }],
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };
}

interface ElkChildNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  labels?: { text: string }[];
}

interface ElkEdgeSection {
  startPoint?: { x: number; y: number };
  bendPoints?: { x: number; y: number }[];
  endPoint?: { x: number; y: number };
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  sections?: ElkEdgeSection[];
}

interface ElkLayoutResult {
  width?: number;
  height?: number;
  children?: ElkChildNode[];
  edges?: ElkEdge[];
}

export function convertElkResultToLayoutGraph(
  elkResult: ElkLayoutResult,
): LayoutGraph {
  const nodes: LayoutNode[] = (elkResult.children || []).map((child) => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
    width: child.width ?? 120,
    height: child.height ?? 60,
    label: child.labels?.[0]?.text ?? child.id,
  }));

  const edges: LayoutEdge[] = (elkResult.edges || []).map((edge) => {
    const points: { x: number; y: number }[] = [];
    if (edge.sections) {
      for (const sec of edge.sections) {
        if (sec.startPoint) points.push(sec.startPoint);
        if (sec.bendPoints) points.push(...sec.bendPoints);
        if (sec.endPoint) points.push(sec.endPoint);
      }
    }
    return {
      id: edge.id,
      source: edge.sources[0],
      target: edge.targets[0],
      points,
    };
  });

  return {
    width: elkResult.width ?? 800,
    height: elkResult.height ?? 600,
    nodes,
    edges,
  };
}

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
