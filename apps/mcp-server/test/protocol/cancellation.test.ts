import type { IconLoader } from "@archlex/icons-core";
import { describe, expect, test } from "vitest";
import { createRequestAbortScope } from "../../src/protocol/router.js";
import { listenForNotifications } from "../../src/protocol/subscriptions.js";
import { handleGetCatalog } from "../../src/tools/catalog.js";
import { handleRenderDiagram } from "../../src/tools/render.js";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("domain cancellation propagation", () => {
  test("stops render and catalog work when the request is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      handleRenderDiagram(
        { source: "provider aws\napp: ecs", format: "svg" },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      handleGetCatalog(
        { provider: "all", query: "compute" },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  test("propagates client cancellation during icon hydration instead of falling back", async () => {
    const controller = new AbortController();
    const stalledLoader: IconLoader = {
      loadIcons(_requests, options) {
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(options.signal?.reason),
            { once: true },
          );
        });
      },
    };

    const rendering = handleRenderDiagram(
      { source: "provider aws\nbuild: codebuild", format: "svg" },
      {
        signal: controller.signal,
        iconLoader: stalledLoader,
        iconHydrationTimeoutMs: 60_000,
      },
    );
    controller.abort();
    await expect(rendering).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("request deadlines", () => {
  test("caps a configured request timeout at the absolute maximum", async () => {
    const scope = createRequestAbortScope(new AbortController().signal, {
      MCP_REQUEST_TIMEOUT_MS: "1000",
      MCP_MAX_REQUEST_TIMEOUT_MS: "5",
    });
    expect(scope.timeoutMs).toBe(5);
    await delay(10);
    expect(scope.signal).toMatchObject({ aborted: true });
    expect(scope.signal.reason).toMatchObject({ name: "TimeoutError" });
    scope.cleanup();
  });

  test("cleanup prevents a completed request from timing out later", async () => {
    const scope = createRequestAbortScope(new AbortController().signal, {
      MCP_REQUEST_TIMEOUT_MS: "5",
    });
    scope.cleanup();
    await delay(10);
    expect(scope.signal.aborted).toBe(false);
  });
});

describe("subscription cancellation races", () => {
  test("disconnect cleanup wins over a later graceful shutdown", async () => {
    const shutdown = new AbortController();
    const stream = listenForNotifications(
      "race-1",
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
    await reader.cancel();
    expect(() => shutdown.abort()).not.toThrow();
  });
});
