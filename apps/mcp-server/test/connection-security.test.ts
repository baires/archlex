import { afterEach, beforeEach, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { inMemoryRateLimiter } from "../src/security.js";

beforeEach(() => inMemoryRateLimiter.reset());
afterEach(() => vi.useRealTimers());

async function connect(signal?: AbortSignal) {
  const response = await worker.fetch(
    new Request("https://review.invalid/sse", { signal }),
    { RATE_LIMIT_MAX_REQUESTS: "1000" },
  );
  if (!response.body) throw new Error("Missing SSE response body");
  const reader = response.body.getReader();
  const first = await reader.read();
  const match = new TextDecoder()
    .decode(first.value)
    .match(/sessionId=([^\n]+)/);
  if (!match) throw new Error("Missing SSE session ID");
  const sessionId = match[1];
  return { reader, sessionId };
}

async function post(sessionId: string) {
  return worker.fetch(
    new Request(`https://review.invalid/messages?sessionId=${sessionId}`, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    }),
  );
}

it("removes a disconnected legacy session", async () => {
  const { reader, sessionId } = await connect();
  await reader.cancel();
  expect((await post(sessionId)).status).toBe(404);
});

it("removes legacy sessions when the client aborts", async () => {
  const controller = new AbortController();
  const { reader, sessionId } = await connect(controller.signal);
  controller.abort();
  const response = await post(sessionId);
  await reader.cancel();
  expect(response.status).toBe(404);
});

it("expires legacy sessions even if clients never disconnect", async () => {
  vi.useFakeTimers();
  const { reader, sessionId } = await connect();
  await vi.advanceTimersByTimeAsync(300_001);
  const response = await post(sessionId);
  await reader.cancel();
  expect(response.status).toBe(404);
});

it("bounds limiter cardinality without evicting live quotas, then frees expired capacity", () => {
  vi.useFakeTimers();
  for (let i = 0; i < 10_000; i++) {
    expect(inMemoryRateLimiter.check(`client-${i}`, 2, 60000).allowed).toBe(
      true,
    );
  }
  expect(inMemoryRateLimiter.check("overflow", 2, 60000).allowed).toBe(false);
  expect(inMemoryRateLimiter.check("client-0", 2, 60000).allowed).toBe(true);
  expect(inMemoryRateLimiter.check("client-0", 2, 60000).allowed).toBe(false);
  vi.advanceTimersByTime(60001);
  expect(inMemoryRateLimiter.check("overflow", 2, 60000).allowed).toBe(true);
});

it("caps active legacy sessions and reclaims disconnected capacity", async () => {
  const sessions = await Promise.all(
    Array.from({ length: 100 }, () => connect()),
  );
  try {
    const overflow = await worker.fetch(
      new Request("https://review.invalid/sse"),
      { RATE_LIMIT_MAX_REQUESTS: "1000" },
    );
    expect(overflow.status).toBe(503);
    expect(overflow.headers.get("Retry-After")).toBe("5");
    await sessions[0].reader.cancel();
    const replacement = await connect();
    await replacement.reader.cancel();
  } finally {
    await Promise.all(sessions.map(({ reader }) => reader.cancel()));
  }
});
