import type {
  Progress,
  ProgressToken,
  RequestId,
} from "@modelcontextprotocol/server";
import { JSONRPC_ERROR_CODES, MCP_METHODS } from "./constants.js";
import { McpProtocolError } from "./errors.js";

const encoder = new TextEncoder();

function sseData(message: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
}

function errorPayload(error: unknown): {
  code: number;
  message: string;
  data?: unknown;
} {
  if (error instanceof McpProtocolError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.data === undefined ? {} : { data: error.data }),
    };
  }
  return {
    code: JSONRPC_ERROR_CODES.INTERNAL_ERROR,
    message: "Internal error",
  };
}

export function requestProgressToken(
  params: Record<string, unknown>,
): ProgressToken | undefined {
  const meta = params._meta;
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
    return undefined;
  }
  const token = (meta as Record<string, unknown>).progressToken;
  return typeof token === "string" || typeof token === "number"
    ? token
    : undefined;
}

export function progressResponse(
  requestId: RequestId,
  progressToken: ProgressToken,
  execute: (onProgress: (progress: Progress) => void) => Promise<unknown>,
  lifecycle: { abort: (reason?: unknown) => void; cleanup: () => void },
): Response {
  let closed = false;
  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    lifecycle.cleanup();
  };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let previous = Number.NEGATIVE_INFINITY;
      const onProgress = (progress: Progress): void => {
        if (closed) return;
        if (progress.progress < previous) {
          throw new TypeError("Progress must be monotonic");
        }
        previous = progress.progress;
        controller.enqueue(
          sseData({
            jsonrpc: "2.0",
            method: MCP_METHODS.NOTIFICATIONS_PROGRESS,
            params: { progressToken, ...progress },
          }),
        );
      };

      void execute(onProgress)
        .then((result) => {
          if (closed) return;
          controller.enqueue(
            sseData({ jsonrpc: "2.0", id: requestId, result }),
          );
        })
        .catch((error: unknown) => {
          if (closed) return;
          controller.enqueue(
            sseData({
              jsonrpc: "2.0",
              id: requestId,
              error: errorPayload(error),
            }),
          );
        })
        .finally(() => {
          cleanup();
          if (closed) return;
          closed = true;
          controller.close();
        });
    },
    cancel(reason) {
      if (closed) return;
      closed = true;
      lifecycle.abort(reason);
      cleanup();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
