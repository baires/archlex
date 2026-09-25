import { describe, expect, it, vi } from "vitest";
import { handleGeneratePlaygroundUrl } from "../src/tools/playground.js";
import { handleRenderDiagram } from "../src/tools/render.js";
import {
  createShareLinks,
  shareConfigFromEnv,
  sharePreviewText,
} from "../src/tools/share-link.js";

const SOURCE = "provider aws\nlambda";

describe("createShareLinks", () => {
  it("posts source and returns the short share urls", async () => {
    const fetchFn = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          id: "PyS4cb6_OVTHGEfGqdAwvw",
          playgroundUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw",
          svgUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.svg",
          pngUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.png",
          revokeToken: "one-time-token",
        }),
    );

    const links = await createShareLinks(SOURCE, {
      origin: "https://share.archlex.dev",
      token: "service-secret",
      fetch: fetchFn,
    });

    expect(links?.playgroundUrl).toBe(
      "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw",
    );
    expect(links?.revokeToken).toBe("one-time-token");
    const init = fetchFn.mock.calls[0]?.[1];
    if (!init) throw new Error("missing request init");
    expect(JSON.parse(String(init.body))).toEqual({ source: SOURCE });
    expect(init.headers).toMatchObject({
      authorization: "Bearer service-secret",
    });
  });

  it("returns undefined when the share service fails", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(
      createShareLinks(SOURCE, {
        origin: "https://share.archlex.dev",
        fetch: fetchFn,
      }),
    ).resolves.toBeUndefined();
  });

  it("hashes the caller address into the service caller header", async () => {
    const fetchFn = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          id: "PyS4cb6_OVTHGEfGqdAwvw",
          playgroundUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw",
          svgUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.svg",
          pngUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.png",
        }),
    );
    await createShareLinks(SOURCE, {
      origin: "https://share.archlex.dev",
      token: "service-secret",
      clientAddress: "203.0.113.5",
      fetch: fetchFn,
    });
    const request = fetchFn.mock.calls[0]?.[1];
    const expected = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode("203.0.113.5"),
          ),
        ),
      ),
    )
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    expect(request?.headers).toMatchObject({ "x-archlex-client": expected });
    expect(JSON.stringify(request?.headers)).not.toContain("203.0.113.5");
  });

  it("does not send a caller header without a service token", async () => {
    const fetchFn = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          id: "PyS4cb6_OVTHGEfGqdAwvw",
          playgroundUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw",
          svgUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.svg",
          pngUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.png",
        }),
    );
    await createShareLinks(SOURCE, {
      origin: "https://share.archlex.dev",
      clientAddress: "203.0.113.5",
      fetch: fetchFn,
    });
    const request = fetchFn.mock.calls[0]?.[1];

    expect(request?.headers).not.toHaveProperty("x-archlex-client");
  });

  it("takes the client address from Cloudflare's request header", () => {
    const config = shareConfigFromEnv(
      { SHARE_ORIGIN: "https://share.archlex.dev" },
      new Request("https://mcp.archlex.dev/mcp", {
        headers: { "cf-connecting-ip": "203.0.113.5" },
      }),
    );

    expect(config?.clientAddress).toBe("203.0.113.5");
  });

  it("accepts only the configured localhost share origin in development", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        id: "PyS4cb6_OVTHGEfGqdAwvw",
        playgroundUrl: "http://localhost:8787/s/PyS4cb6_OVTHGEfGqdAwvw",
        svgUrl: "http://localhost:8787/s/PyS4cb6_OVTHGEfGqdAwvw.svg",
        pngUrl: "http://localhost:8787/s/PyS4cb6_OVTHGEfGqdAwvw.png",
      }),
    );

    await expect(
      createShareLinks(SOURCE, {
        origin: "http://localhost:8787",
        fetch: fetchFn,
      }),
    ).resolves.toMatchObject({ id: "PyS4cb6_OVTHGEfGqdAwvw" });
  });

  it("drops share responses with URLs on a different origin", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        id: "PyS4cb6_OVTHGEfGqdAwvw",
        playgroundUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw",
        svgUrl: "https://attacker.example/s/PyS4cb6_OVTHGEfGqdAwvw.svg",
        pngUrl: "https://share.archlex.dev/s/PyS4cb6_OVTHGEfGqdAwvw.png",
      }),
    );
    await expect(
      createShareLinks(SOURCE, {
        origin: "https://share.archlex.dev",
        fetch: fetchFn,
      }),
    ).resolves.toBeUndefined();
  });
});

describe("render_diagram share links", () => {
  it("returns the short link and a png preview when a share is created", async () => {
    const result = await handleRenderDiagram(
      { source: "provider aws\nlambda" },
      {
        createShare: async () => ({
          id: "abc",
          playgroundUrl: "https://share.archlex.dev/s/abc",
          svgUrl: "https://share.archlex.dev/s/abc.svg",
          pngUrl: "https://share.archlex.dev/s/abc.png",
        }),
      },
    );
    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.playground_url).toBe("https://share.archlex.dev/s/abc");
    expect(structured.png_url).toBe("https://share.archlex.dev/s/abc.png");
    const text = result.content.find((item) => item.type === "text");
    expect(text && "text" in text ? text.text : "").toContain(
      "![Architecture diagram: 1 node, 0 edges](https://share.archlex.dev/s/abc.png)",
    );
  });

  it("returns revoke token only in structured content", async () => {
    const result = await handleRenderDiagram(
      { source: "provider aws\nlambda" },
      {
        createShare: async () => ({
          id: "abc",
          playgroundUrl: "https://share.archlex.dev/s/abc",
          svgUrl: "https://share.archlex.dev/s/abc.svg",
          pngUrl: "https://share.archlex.dev/s/abc.png",
          revokeToken: "one-time-token",
        }),
      },
    );
    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.revoke_token).toBe("one-time-token");
    expect(JSON.stringify(result.content)).not.toContain("one-time-token");
    expect(JSON.stringify(result.content)).not.toContain("Bearer");
  });
});

describe("sharePreviewText", () => {
  it("embeds the image url and the short link", () => {
    expect(
      sharePreviewText(
        "Architecture diagram",
        "https://share.archlex.dev/s/abc.png",
        "https://share.archlex.dev/s/abc",
      ),
    ).toBe(
      "![Architecture diagram](https://share.archlex.dev/s/abc.png)\n\nhttps://share.archlex.dev/s/abc",
    );
  });
});

describe("generate_playground_url share token", () => {
  it("puts the revoke token only in structured content", async () => {
    const result = await handleGeneratePlaygroundUrl(
      { source: SOURCE },
      {
        createShare: async () => ({
          id: "abc",
          playgroundUrl: "https://share.archlex.dev/s/abc",
          svgUrl: "https://share.archlex.dev/s/abc.svg",
          pngUrl: "https://share.archlex.dev/s/abc.png",
          revokeToken: "one-time-token",
        }),
      },
    );
    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.revoke_token).toBe("one-time-token");
    expect(JSON.stringify(result.content)).not.toContain("one-time-token");
  });
});
