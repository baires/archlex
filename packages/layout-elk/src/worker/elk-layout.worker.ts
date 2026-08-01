/**
 * Web Worker for ELK layout computation.
 * Runs layout in a separate thread to avoid blocking the main thread.
 */

import type { CloudGraph, LayoutOptions, LayoutResult } from "@archlex/model";
import { ArchLexInternalError } from "@archlex/model";
import ELK from "elkjs/lib/elk-worker.min.js";
import {
  type ElkLayoutResult,
  buildElkGraph,
  convertElkResultToLayoutGraph,
} from "../adapter/index.js";
import { LayoutCache, computeGeometryFingerprint } from "../cache/index.js";
import {
  PROTOCOL_VERSION,
  type WorkerLayoutRequest,
  type WorkerLayoutResponse,
} from "./index.js";

const elk = new ELK();
const cache = new LayoutCache();

self.onmessage = async (event: MessageEvent<WorkerLayoutRequest>) => {
  const request = event.data;

  // Validate protocol version
  if (request.protocolVersion !== PROTOCOL_VERSION) {
    const response: WorkerLayoutResponse = {
      protocolVersion: PROTOCOL_VERSION,
      requestId: request.requestId,
      error: `Protocol version mismatch. Worker: ${PROTOCOL_VERSION}, Request: ${request.protocolVersion}`,
    };
    self.postMessage(response);
    return;
  }

  const startTime = performance.now();

  try {
    const graph: CloudGraph = request.graph;
    const options: LayoutOptions | undefined = request.options;

    // Check cache
    const fingerprint = computeGeometryFingerprint(graph, options);
    const cached = cache.get(fingerprint);

    if (cached) {
      const result: LayoutResult = {
        graph: cached,
        diagnostics: [],
        metadata: {
          engine: "elk-worker",
          fingerprint,
          durationMs: 0,
        },
      };

      const response: WorkerLayoutResponse = {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        result,
      };

      self.postMessage(response);
      return;
    }

    // Perform layout
    const elkGraph = buildElkGraph(graph, options?.direction);
    const elkResult = (await elk.layout(elkGraph)) as ElkLayoutResult;
    const layoutGraph = convertElkResultToLayoutGraph(elkResult);
    const durationMs = performance.now() - startTime;

    // Cache result
    cache.set(fingerprint, layoutGraph);

    const result: LayoutResult = {
      graph: layoutGraph,
      diagnostics: [],
      metadata: {
        engine: "elk-worker",
        fingerprint,
        durationMs,
      },
    };

    const response: WorkerLayoutResponse = {
      protocolVersion: PROTOCOL_VERSION,
      requestId: request.requestId,
      result,
    };

    self.postMessage(response);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof ArchLexInternalError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    const response: WorkerLayoutResponse = {
      protocolVersion: PROTOCOL_VERSION,
      requestId: request.requestId,
      error: `ELK layout failed: ${errorMessage}`,
    };

    self.postMessage(response);
  }
};
