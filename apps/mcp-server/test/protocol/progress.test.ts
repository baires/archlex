import {
  CallToolResultSchema,
  ProgressNotificationSchema,
} from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test, vi } from "vitest";
import worker from "../../src/index.js";
import { MODERN_PROTOCOL_VERSION } from "../../src/protocol/constants.js";
import { progressResponse } from "../../src/protocol/progress.js";
import { createRequestAbortScope } from "../../src/protocol/router.js";
import { handleRenderDiagram } from "../../src/tools/render.js";

function renderRequest(progressToken?: string | number): Request {
  const method = "tools/call";
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": method,
      "Mcp-Name": "render_diagram",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "render-progress",
      method,
      params: {
        name: "render_diagram",
        arguments: {
          source: "provider aws\napi: apigateway",
          format: "svg",
        },
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
          [CLIENT_CAPABILITIES_META_KEY]: {},
          ...(progressToken === undefined ? {} : { progressToken }),
        },
      },
    }),
  });
}

function parseSseMessages(body: string): Record<string, unknown>[] {
  return body
    .split("\n\n")
    .filter(Boolean)
    .map((event) => {
      const data = event
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice("data: ".length);
      if (!data) throw new Error(`Missing SSE data in ${event}`);
      return JSON.parse(data) as Record<string, unknown>;
    });
}

describe("request-scoped progress", () => {
  test("streams schema-valid monotonic render stages with the exact token before the final result", async () => {
    const token = 73;
    const response = await worker.fetch(renderRequest(token));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const messages = parseSseMessages(await response.text());
    const progress = messages.slice(0, -1);
    const final = messages.at(-1);

    expect(progress).toHaveLength(5);
    expect(
      progress.every(
        (message) => ProgressNotificationSchema.safeParse(message).success,
      ),
    ).toBe(true);
    expect(progress.map((message) => message.params)).toEqual([
      { progressToken: token, progress: 1, total: 5, message: "Parsing" },
      { progressToken: token, progress: 2, total: 5, message: "Validating" },
      {
        progressToken: token,
        progress: 3,
        total: 5,
        message: "Hydrating icons",
      },
      { progressToken: token, progress: 4, total: 5, message: "Laying out" },
      { progressToken: token, progress: 5, total: 5, message: "Rendering" },
    ]);
    expect(final).toMatchObject({ jsonrpc: "2.0", id: "render-progress" });
    expect(CallToolResultSchema.safeParse(final?.result).success).toBe(true);
  });

  test("keeps tokenless renders on the non-streaming JSON path", async () => {
    const response = await worker.fetch(renderRequest());
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const message = (await response.json()) as Record<string, unknown>;
    expect(CallToolResultSchema.safeParse(message.result).success).toBe(true);
  });

  test("aborts request work and emits nothing further when the response is cancelled", async () => {
    const scope = createRequestAbortScope(new AbortController().signal);
    let executionRejected = false;
    const response = progressResponse(
      "cancelled-progress",
      "cancel-token",
      async (onProgress) => {
        onProgress({ progress: 1, total: 2 });
        try {
          await new Promise<void>((_resolve, reject) => {
            scope.signal.addEventListener(
              "abort",
              () => reject(scope.signal.reason),
              { once: true },
            );
          });
        } catch (error: unknown) {
          executionRejected = true;
          throw error;
        }
      },
      { abort: scope.abort, cleanup: scope.cleanup },
    );
    if (!response.body) throw new Error("Progress response has no body");
    const reader = response.body.getReader();
    expect((await reader.read()).done).toBe(false);
    await reader.cancel("client disconnected");
    await vi.waitFor(() => expect(scope.signal.aborted).toBe(true));
    await vi.waitFor(() => expect(executionRejected).toBe(true));
  });

  test("does not report terminal PNG progress before rasterization finishes", async () => {
    let finishRasterization: ((bytes: Uint8Array) => void) | undefined;
    const rasterization = new Promise<Uint8Array>((resolve) => {
      finishRasterization = resolve;
    });
    const updates: number[] = [];
    const rendering = handleRenderDiagram(
      { source: "provider aws\napi: apigateway", format: "png" },
      {
        onProgress: ({ progress }) => updates.push(progress),
        rasterizer: () => rasterization,
      },
    );

    await vi.waitFor(() => expect(updates).toEqual([1, 2, 3, 4]));
    expect(updates).not.toContain(5);
    finishRasterization?.(Uint8Array.from([137, 80, 78, 71]));
    await rendering;
    expect(updates).toEqual([1, 2, 3, 4, 5]);
  });
});
