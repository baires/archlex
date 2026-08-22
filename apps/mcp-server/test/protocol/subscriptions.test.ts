import {
  SubscriptionsAcknowledgedNotificationSchema,
  SubscriptionsListenResultSchema,
} from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import { MODERN_PROTOCOL_VERSION } from "../../src/protocol/constants.js";
import {
  acceptedSubscriptionFilter,
  listenForNotifications,
} from "../../src/protocol/subscriptions.js";

function decodeChunk(value: Uint8Array | undefined): string {
  return new TextDecoder().decode(value);
}

function parseSseData(chunk: string): Record<string, unknown> {
  const data = chunk
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  if (!data) throw new Error(`Missing SSE data in ${JSON.stringify(chunk)}`);
  return JSON.parse(data) as Record<string, unknown>;
}

function subscriptionRequest(): Request {
  const method = "subscriptions/listen";
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": method,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "subscription-1",
      method,
      params: {
        notifications: {
          toolsListChanged: true,
          promptsListChanged: true,
          resourcesListChanged: true,
          resourceSubscriptions: ["archlex://docs/dsl-syntax"],
        },
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

describe("subscription filter negotiation", () => {
  test("acknowledges only the requested subset the server can really produce", () => {
    expect(
      acceptedSubscriptionFilter(
        {
          toolsListChanged: true,
          promptsListChanged: true,
          resourcesListChanged: false,
          resourceSubscriptions: [
            "archlex://docs/dsl-syntax",
            "archlex://other",
          ],
        },
        {
          toolsListChanged: true,
          promptsListChanged: false,
          resourcesListChanged: true,
          resourceSubscriptions: ["archlex://docs/dsl-syntax"],
        },
      ),
    ).toEqual({
      toolsListChanged: true,
      resourceSubscriptions: ["archlex://docs/dsl-syntax"],
    });
  });
});

describe("request-scoped subscription SSE", () => {
  test("sends an empty-subset acknowledgment first when no event source exists", async () => {
    const response = await worker.fetch(subscriptionRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    expect(response.headers.get("Mcp-Session-Id")).toBeNull();

    if (!response.body) throw new Error("Subscription response has no body");
    const reader = response.body.getReader();
    const first = decodeChunk((await reader.read()).value);
    expect(first).not.toContain("id:");
    const message = parseSseData(first);
    expect(
      SubscriptionsAcknowledgedNotificationSchema.safeParse(message).success,
    ).toBe(true);
    expect(message).toMatchObject({
      jsonrpc: "2.0",
      method: "notifications/subscriptions/acknowledged",
      params: {
        notifications: {},
        _meta: {
          "io.modelcontextprotocol/subscriptionId": "subscription-1",
        },
      },
    });
    await reader.cancel();
  });

  test("emits periodic SSE comments without event IDs", async () => {
    const stream = listenForNotifications(
      "subscription-keepalive",
      { toolsListChanged: true },
      {
        signal: new AbortController().signal,
        supportedNotifications: {},
        keepAliveMs: 5,
      },
    );
    const reader = stream.getReader();
    await reader.read();
    const keepAlive = decodeChunk((await reader.read()).value);
    expect(keepAlive).toBe(": keepalive\n\n");
    expect(keepAlive).not.toContain("id:");
    await reader.cancel();
  });

  test("correlates graceful completion and emits nothing after it", async () => {
    const shutdown = new AbortController();
    const stream = listenForNotifications(
      42,
      {},
      {
        signal: new AbortController().signal,
        shutdownSignal: shutdown.signal,
        supportedNotifications: {},
        keepAliveMs: 60_000,
      },
    );
    const reader = stream.getReader();
    await reader.read();
    shutdown.abort();
    const completion = parseSseData(decodeChunk((await reader.read()).value));
    expect(completion).toMatchObject({
      jsonrpc: "2.0",
      id: 42,
      result: {
        resultType: "complete",
        _meta: {
          "io.modelcontextprotocol/subscriptionId": 42,
        },
      },
    });
    expect(
      SubscriptionsListenResultSchema.safeParse(completion.result).success,
    ).toBe(true);
    expect(await reader.read()).toEqual({ done: true, value: undefined });
  });
});
