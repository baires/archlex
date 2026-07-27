import type { CloudGraph, LayoutOptions, LayoutResult } from "@cloudmer/model";

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
