import type { CloudGraph, LayoutOptions, LayoutResult } from "@archlex/model";

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

let nextRequestId = 1;

export function createWorkerRequest(
  graph: CloudGraph,
  options?: LayoutOptions,
): { requestId: number; request: WorkerLayoutRequest } {
  const requestId = nextRequestId++;
  return {
    requestId,
    request: {
      protocolVersion: PROTOCOL_VERSION,
      requestId,
      graph,
      options,
    },
  };
}

export function isStaleResponse(
  response: WorkerLayoutResponse,
  expectedRequestId: number,
): boolean {
  return (
    response.protocolVersion !== PROTOCOL_VERSION ||
    response.requestId !== expectedRequestId
  );
}
