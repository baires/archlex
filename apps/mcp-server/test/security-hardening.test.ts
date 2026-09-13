import { timingSafeEqual } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import {
  inMemoryRateLimiter,
  validateAuthentication,
} from "../src/security.js";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});

beforeEach(() => {
  inMemoryRateLimiter.reset();
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe("bearer credential boundary", () => {
  it.each([
    "review-secret",
    "review-secrex",
    "x",
    "",
    "review-secret-longer",
    "é",
  ])(
    "compares fixed-size digests with native timingSafeEqual for %j",
    (token) => {
      const response = validateAuthentication(
        new Request("https://review.invalid/mcp", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        { MCP_AUTH_TOKEN: "review-secret" },
      );
      expect(response.authorized).toBe(token === "review-secret");
      expect(timingSafeEqual).toHaveBeenCalledOnce();
      const [left, right] = vi.mocked(timingSafeEqual).mock.calls[0];
      expect(left.byteLength).toBe(32);
      expect(right.byteLength).toBe(32);
    },
  );

  it("does not accept query credentials on either transport", async () => {
    for (const path of ["/mcp", "/sse", "/messages"]) {
      const response = await worker.fetch(
        new Request(`https://review.invalid${path}?token=secret`),
        {
          MCP_AUTH_TOKEN: "secret",
        },
      );
      expect(response.status).toBe(401);
    }
  });
});

function body(padding: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "server/discover",
    params: {
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
        padding,
      },
    },
  });
}
const headers = {
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
  "MCP-Protocol-Version": "2026-07-28",
  "Mcp-Method": "server/discover",
};

describe("body byte limits", () => {
  it.each(["/mcp", "/messages"])(
    "rejects undeclared oversized bodies at %s",
    async (path) => {
      const response = await worker.fetch(
        new Request(`https://review.invalid${path}`, {
          method: "POST",
          headers,
          body: body("é".repeat(300_000)),
        }),
      );
      expect(response.status).toBe(413);
    },
  );

  it("cancels a chunked body as soon as the limit is exceeded", async () => {
    let canceled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(300_000));
      },
      cancel() {
        canceled = true;
      },
    });
    const request = new Request("https://review.invalid/mcp", {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    } as RequestInit);
    const response = await worker.fetch(request);
    expect(response.status).toBe(413);
    expect(canceled).toBe(true);
  });

  it("preserves valid requests below the body limit", async () => {
    const response = await worker.fetch(
      new Request("https://review.invalid/mcp", {
        method: "POST",
        headers,
        body: body("small"),
      }),
    );
    expect(response.status).toBe(200);
  });
});
