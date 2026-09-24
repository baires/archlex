import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SHARE_ORIGIN,
  configuredShareOrigin,
  loadSharedSource,
  revokeSharedDiagram,
  shareClipboardText,
  shareDiagram,
  shareFailureMessage,
  shareRequestOrigin,
} from "./share.js";

const SOURCE = 'provider aws\napi: lambda["Orders"]\n';

describe("configuredShareOrigin", () => {
  it("uses the local worker in dev and production otherwise", () => {
    expect(configuredShareOrigin(undefined, true)).toBe("");
    expect(configuredShareOrigin(undefined, false)).toBe(DEFAULT_SHARE_ORIGIN);
    expect(configuredShareOrigin("https://share.example/", true)).toBe(
      "https://share.example",
    );
  });
});

describe("shareRequestOrigin", () => {
  it("keeps a local playground on its own origin", () => {
    expect(
      shareRequestOrigin("https://share.archlex.dev", "http://localhost:5173"),
    ).toBe("http://localhost:5173");
    expect(shareRequestOrigin("", "https://playground.archlex.dev")).toBe(
      "https://share.archlex.dev",
    );
  });
});

describe("shareClipboardText", () => {
  it("copies a markdown image and the playground link", () => {
    expect(
      shareClipboardText(
        "https://share.archlex.dev/s/abc.svg",
        "https://share.archlex.dev/s/abc",
      ),
    ).toBe(
      "![Architecture diagram](https://share.archlex.dev/s/abc.svg)\n\nhttps://share.archlex.dev/s/abc",
    );
  });
});

describe("loadSharedSource", () => {
  it("fetches source JSON from the share origin", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ source: SOURCE }), { status: 200 }),
    );

    const result = await loadSharedSource("abc_XYZ-12", fetchFn);

    expect(result).toEqual({ ok: true, source: SOURCE });
    expect(fetchFn).toHaveBeenCalledWith(
      `${DEFAULT_SHARE_ORIGIN}/v1/shares/abc_XYZ-12`,
    );
    expect(DEFAULT_SHARE_ORIGIN).toBe("https://share.archlex.dev");
  });

  it("returns a short error and does not echo the response body", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "not_found", source: "SECRET" }), {
          status: 404,
        }),
    );

    const result = await loadSharedSource("missing", fetchFn);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Share link expired or missing");
      expect(result.message).not.toContain("SECRET");
    }
  });

  it("returns a short error when the network fails", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("boom SECRET");
    });

    const result = await loadSharedSource("abc", fetchFn);

    expect(result).toEqual({ ok: false, message: "Could not load share" });
  });
});

describe("shareDiagram", () => {
  it("calls fetch with the global this binding", async () => {
    const fetchFn = vi.fn(async function (
      this: unknown,
      _input: RequestInfo | URL,
    ) {
      if (this !== globalThis) {
        throw new TypeError(
          "'fetch' called on an object that does not implement interface Window.",
        );
      }
      return Response.json({
        id: "abc",
        playgroundUrl: "https://share.archlex.dev/s/abc",
        svgUrl: "https://share.archlex.dev/s/abc.svg",
        pngUrl: "https://share.archlex.dev/s/abc.png",
      });
    });

    const result = await shareDiagram(SOURCE, { fetch: fetchFn });

    expect(result).toEqual({
      ok: true,
      id: "abc",
      playgroundUrl: "https://share.archlex.dev/s/abc",
      svgUrl: "https://share.archlex.dev/s/abc.svg",
    });
  });

  it("posts source only and returns both share URLs", async () => {
    const fetchFn = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          id: "abc",
          playgroundUrl: "https://share.archlex.dev/s/abc",
          svgUrl: "https://share.archlex.dev/s/abc.svg",
          pngUrl: "https://share.archlex.dev/s/abc.png",
        }),
    );

    const result = await shareDiagram(SOURCE, { fetch: fetchFn });

    expect(result).toEqual({
      ok: true,
      id: "abc",
      playgroundUrl: "https://share.archlex.dev/s/abc",
      svgUrl: "https://share.archlex.dev/s/abc.svg",
    });
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(`${DEFAULT_SHARE_ORIGIN}/v1/shares`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ source: SOURCE });
  });

  it("returns revokeToken when provided in the share response", async () => {
    const fetchFn = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          id: "abc",
          revokeToken: "secret-token-123",
          playgroundUrl: "https://share.archlex.dev/s/abc",
          svgUrl: "https://share.archlex.dev/s/abc.svg",
          pngUrl: "https://share.archlex.dev/s/abc.png",
        }),
    );

    const result = await shareDiagram(SOURCE, { fetch: fetchFn });

    expect(result).toEqual({
      ok: true,
      id: "abc",
      revokeToken: "secret-token-123",
      playgroundUrl: "https://share.archlex.dev/s/abc",
      svgUrl: "https://share.archlex.dev/s/abc.svg",
    });
  });

  it("maps overload statuses to short messages without the response body", () => {
    expect(shareFailureMessage(413, "SECRET")).toBe(
      "Diagram is too large to share",
    );
    expect(shareFailureMessage(429, "SECRET")).toBe(
      "Too many shares. Try again later",
    );
    expect(shareFailureMessage(503, "SECRET")).toBe(
      "Share is temporarily unavailable",
    );
    expect(shareFailureMessage(500, "SECRET")).not.toContain("SECRET");
  });
});

describe("revokeSharedDiagram", () => {
  it("sends DELETE with bearer token to the share endpoint", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const result = await revokeSharedDiagram("abc", "tok-123", {
      fetch: fetchFn,
    });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith(
      `${DEFAULT_SHARE_ORIGIN}/v1/shares/abc`,
      {
        method: "DELETE",
        headers: { authorization: "Bearer tok-123" },
      },
    );
  });

  it("returns error message when revoke returns non-204", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 404 }));
    const result = await revokeSharedDiagram("abc", "tok-123", {
      fetch: fetchFn,
    });
    expect(result).toEqual({ ok: false, message: "Could not revoke share" });
  });

  it("does not include revokeToken in shareClipboardText", () => {
    const text = shareClipboardText(
      "https://share.archlex.dev/s/abc.svg",
      "https://share.archlex.dev/s/abc",
    );
    expect(text).not.toContain("tok-123");
    expect(text).not.toContain("Bearer");
  });
});
