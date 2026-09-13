import { afterEach, beforeEach, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { createRenderToken } from "../src/render-links.js";
import { inMemoryRateLimiter } from "../src/security.js";
import * as render from "../src/tools/render.js";

const secret = "dummy-render-security-test-secret";
const result: Awaited<ReturnType<typeof render.renderDiagramPng>> = {
  pngBytes: new Uint8Array([137, 80, 78, 71]),
  svg: "<svg/>",
  diagnostics: [],
  nodesCount: 0,
  edgesCount: 0,
  hasErrors: false,
  playgroundUrl: "https://playground.archlex.dev/",
};
let url: string;
beforeEach(async () => {
  inMemoryRateLimiter.reset();
  const token = await createRenderToken(
    { version: 1, source: "ecs > rds", expiresAt: Date.now() + 60000 },
    secret,
  );
  url = `https://review.invalid/renders/${token}.png`;
});
afterEach(() => vi.restoreAllMocks());

it("rejects canceled render requests before starting work", async () => {
  const renderer = vi
    .spyOn(render, "renderDiagramPng")
    .mockResolvedValue(result);
  const controller = new AbortController();
  controller.abort();
  const response = await worker.fetch(
    new Request(url, { signal: controller.signal }),
    { RENDER_URL_SECRET: secret },
  );
  expect(response.status).toBe(408);
  expect(renderer).not.toHaveBeenCalled();
});

it("enforces the configured deadline on public image requests", async () => {
  vi.spyOn(render, "renderDiagramPng").mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    return result;
  });
  const response = await worker.fetch(new Request(url), {
    RENDER_URL_SECRET: secret,
    MCP_REQUEST_TIMEOUT_MS: "1",
  });
  expect(response.status).toBe(504);
  await new Promise((resolve) => setTimeout(resolve, 20));
});

it("bounds concurrent public renders and recovers capacity after completion", async () => {
  const releases: Array<() => void> = [];
  const renderer = vi.spyOn(render, "renderDiagramPng").mockImplementation(
    () =>
      new Promise((resolve) => {
        releases.push(() => resolve(result));
      }),
  );
  const requests = Array.from({ length: 4 }, () =>
    worker.fetch(new Request(url), { RENDER_URL_SECRET: secret }),
  );
  await vi.waitFor(() => expect(renderer).toHaveBeenCalledTimes(4));
  // A fifth request must fail rather than allocating more render work.
  try {
    const extra = await worker.fetch(new Request(url), {
      RENDER_URL_SECRET: secret,
    });
    expect(extra.status).toBe(503);
  } finally {
    for (const release of releases) release();
    await Promise.all(requests);
  }
  renderer.mockResolvedValue(result);
  expect(
    (await worker.fetch(new Request(url), { RENDER_URL_SECRET: secret }))
      .status,
  ).toBe(200);
});

it("retains concurrency slots until canceled render work actually settles", async () => {
  const releases: Array<() => void> = [];
  const renderer = vi
    .spyOn(render, "renderDiagramPng")
    .mockImplementation(
      () => new Promise((resolve) => releases.push(() => resolve(result))),
    );
  const controller = new AbortController();
  const requests = Array.from({ length: 4 }, () =>
    worker.fetch(new Request(url, { signal: controller.signal }), {
      RENDER_URL_SECRET: secret,
    }),
  );
  try {
    await vi.waitFor(() => expect(renderer).toHaveBeenCalledTimes(4));
    controller.abort();
    expect(
      (await Promise.all(requests)).map((response) => response.status),
    ).toEqual([408, 408, 408, 408]);
    const extra = await worker.fetch(new Request(url), {
      RENDER_URL_SECRET: secret,
    });
    expect(extra.status).toBe(503);
    expect(renderer).toHaveBeenCalledTimes(4);
  } finally {
    for (const release of releases) release();
    await Promise.all(requests);
  }
});
