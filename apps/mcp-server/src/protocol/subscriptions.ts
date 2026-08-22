import type {
  RequestId,
  SubscriptionFilter,
} from "@modelcontextprotocol/server";
import { MCP_METHODS, METADATA_KEYS } from "./constants.js";
import { SERVER_INFO } from "./results.js";

export interface SubscriptionStreamContext {
  signal: AbortSignal;
  shutdownSignal?: AbortSignal;
  supportedNotifications: SubscriptionFilter;
  keepAliveMs?: number;
}

export function acceptedSubscriptionFilter(
  requested: SubscriptionFilter,
  supported: SubscriptionFilter,
): SubscriptionFilter {
  const accepted: SubscriptionFilter = {};
  if (requested.toolsListChanged && supported.toolsListChanged) {
    accepted.toolsListChanged = true;
  }
  if (requested.promptsListChanged && supported.promptsListChanged) {
    accepted.promptsListChanged = true;
  }
  if (requested.resourcesListChanged && supported.resourcesListChanged) {
    accepted.resourcesListChanged = true;
  }
  if (
    requested.resourceSubscriptions?.length &&
    supported.resourceSubscriptions?.length
  ) {
    const supportedUris = new Set(supported.resourceSubscriptions);
    const resourceSubscriptions = requested.resourceSubscriptions.filter(
      (uri) => supportedUris.has(uri),
    );
    if (resourceSubscriptions.length > 0) {
      accepted.resourceSubscriptions = resourceSubscriptions;
    }
  }
  return accepted;
}

function sseData(message: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`);
}

function subscriptionMeta(requestId: RequestId): Record<string, unknown> {
  return { [METADATA_KEYS.SUBSCRIPTION_ID]: requestId };
}

export function listenForNotifications(
  requestId: RequestId,
  requestedFilter: SubscriptionFilter,
  streamContext: SubscriptionStreamContext,
): ReadableStream<Uint8Array> {
  const keepAliveMs = streamContext.keepAliveMs ?? 15_000;
  let interval: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let cleanup = (): void => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const accepted = acceptedSubscriptionFilter(
        requestedFilter,
        streamContext.supportedNotifications,
      );
      const closeAbruptly = (): void => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.close();
      };
      const completeGracefully = (): void => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.enqueue(
          sseData({
            jsonrpc: "2.0",
            id: requestId,
            result: {
              resultType: "complete",
              _meta: {
                "io.modelcontextprotocol/serverInfo": SERVER_INFO,
                ...subscriptionMeta(requestId),
              },
            },
          }),
        );
        controller.close();
      };

      cleanup = (): void => {
        if (interval !== undefined) clearInterval(interval);
        streamContext.signal.removeEventListener("abort", closeAbruptly);
        streamContext.shutdownSignal?.removeEventListener(
          "abort",
          completeGracefully,
        );
      };

      controller.enqueue(
        sseData({
          jsonrpc: "2.0",
          method: MCP_METHODS.NOTIFICATIONS_SUBSCRIPTIONS_ACKNOWLEDGED,
          params: {
            notifications: accepted,
            _meta: subscriptionMeta(requestId),
          },
        }),
      );

      streamContext.signal.addEventListener("abort", closeAbruptly, {
        once: true,
      });
      streamContext.shutdownSignal?.addEventListener(
        "abort",
        completeGracefully,
        { once: true },
      );
      interval = setInterval(() => {
        if (!closed) {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        }
      }, keepAliveMs);

      if (streamContext.signal.aborted) closeAbruptly();
      else if (streamContext.shutdownSignal?.aborted) completeGracefully();
    },
    cancel() {
      if (closed) return;
      closed = true;
      cleanup();
    },
  });
}

export function subscriptionResponse(
  requestId: RequestId,
  requestedFilter: SubscriptionFilter,
  streamContext: SubscriptionStreamContext,
): Response {
  return new Response(
    listenForNotifications(requestId, requestedFilter, streamContext),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    },
  );
}
