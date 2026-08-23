import { describe, expect, it } from "vitest";
import type { RenderLinkPayload } from "../src/render-links.js";
import {
  InvalidRenderTokenError,
  createRenderToken,
  createRenderUrl,
  readRenderToken,
} from "../src/render-links.js";

const SECRET = "test-secret-key-min-32-chars-long-for-aes-256";
const NOW = Date.now();

const SAMPLE_PAYLOAD: RenderLinkPayload = {
  version: 1,
  source: "provider aws\necs > rds",
  theme: "dark",
  direction: "LR",
  validation: "normal",
  expiresAt: NOW + 3600_000,
};

describe("Render token round-trip and confidentiality", () => {
  it("round-trips compressed encrypted render inputs without exposing source", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    expect(token).not.toContain("provider");
    expect(token).not.toContain("aws");
    expect(token).not.toContain("ecs");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect(readRenderToken(token, SECRET, NOW)).resolves.toEqual(
      SAMPLE_PAYLOAD,
    );
  });

  it("compresses large sources before encryption", async () => {
    const largePayload: RenderLinkPayload = {
      version: 1,
      source: `provider aws\n${"ecs > rds\n".repeat(500)}`,
      expiresAt: NOW + 3600_000,
    };
    const token = await createRenderToken(largePayload, SECRET);
    // Token should be much shorter than the raw source
    expect(token.length).toBeLessThan(largePayload.source.length / 2);
    await expect(readRenderToken(token, SECRET, NOW)).resolves.toEqual(
      largePayload,
    );
  });
});

describe("Render token security", () => {
  it("rejects expired tokens", async () => {
    const expiredPayload: RenderLinkPayload = {
      ...SAMPLE_PAYLOAD,
      expiresAt: NOW - 1000,
    };
    const token = await createRenderToken(expiredPayload, SECRET);
    await expect(readRenderToken(token, SECRET, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
  });

  it("rejects tokens with wrong secret", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    const wrongSecret = "different-secret-key-min-32-chars-long-aes";
    await expect(readRenderToken(token, wrongSecret, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
  });

  it("rejects tampered tokens", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    // Flip one character in the middle
    const tampered =
      token.substring(0, token.length / 2) +
      (token[token.length / 2] === "A" ? "B" : "A") +
      token.substring(token.length / 2 + 1);
    await expect(readRenderToken(tampered, SECRET, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
  });

  it("rejects tokens with unsupported version", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    // Decode, change version byte to 2, re-encode
    const bytes = Uint8Array.from(
      atob(token.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    bytes[0] = 2; // Change version from 1 to 2
    const tampered = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    await expect(readRenderToken(tampered, SECRET, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
  });

  it("rejects tokens with invalid structure", async () => {
    await expect(readRenderToken("invalid-token", SECRET, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
    await expect(readRenderToken("", SECRET, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
  });

  it("rejects decrypted payloads with invalid optional enums", async () => {
    const token = await createRenderToken(
      {
        ...SAMPLE_PAYLOAD,
        theme: "sepia" as RenderLinkPayload["theme"],
      },
      SECRET,
    );
    await expect(readRenderToken(token, SECRET, NOW)).rejects.toThrow(
      InvalidRenderTokenError,
    );
  });

  it("restores base64 padding when decoding unpadded tokens", async () => {
    const token = await createRenderToken(SAMPLE_PAYLOAD, SECRET);
    expect(token).not.toMatch(/=/);
    await expect(readRenderToken(token, SECRET, NOW)).resolves.toEqual(
      SAMPLE_PAYLOAD,
    );
  });
});

describe("Render URL generation and fallback", () => {
  it("returns embedded delivery when secret is not configured", async () => {
    const result = await createRenderUrl(SAMPLE_PAYLOAD, {
      secret: "",
      ttlSeconds: 3600,
      maxUrlLength: 8000,
      baseUrl: "https://mcp.archlex.dev",
    });
    expect(result).toEqual({
      delivery: "embedded",
      reason: "render_url_unconfigured",
    });
  });

  it("returns url delivery when token fits within max length", async () => {
    const result = await createRenderUrl(SAMPLE_PAYLOAD, {
      secret: SECRET,
      ttlSeconds: 3600,
      maxUrlLength: 8000,
      baseUrl: "https://mcp.archlex.dev",
    });
    expect(result).toMatchObject({
      delivery: "url",
      url: expect.stringMatching(
        /^https:\/\/mcp\.archlex\.dev\/renders\/.+\.png$/,
      ),
      expiresAt: expect.any(String),
    });
    if (result.delivery === "url") {
      expect(result.url.length).toBeLessThan(8000);
    }
  });

  it("returns embedded delivery when source is too large for URL", async () => {
    // Generate a source with high entropy (doesn't compress well)
    const randomChars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let randomSource = "provider aws\n";
    for (let i = 0; i < 1000; i++) {
      const randomName = Array.from({ length: 20 }, () =>
        randomChars.charAt(Math.floor(Math.random() * randomChars.length)),
      ).join("");
      randomSource += `${randomName}: ecs\n`;
    }
    const largePayload: RenderLinkPayload = {
      version: 1,
      source: randomSource,
      expiresAt: NOW + 3600_000,
    };
    const result = await createRenderUrl(largePayload, {
      secret: SECRET,
      ttlSeconds: 3600,
      maxUrlLength: 500, // Very small limit
      baseUrl: "https://mcp.archlex.dev",
    });
    expect(result).toEqual({
      delivery: "embedded",
      reason: "source_too_large",
    });
  });

  it("includes expiration timestamp in ISO 8601 format", async () => {
    const result = await createRenderUrl(SAMPLE_PAYLOAD, {
      secret: SECRET,
      ttlSeconds: 3600,
      maxUrlLength: 8000,
      baseUrl: "https://mcp.archlex.dev",
    });
    if (result.delivery === "url") {
      const expiresAt = new Date(result.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(result.expiresAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    }
  });
});
