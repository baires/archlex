import { describe, expect, it } from "vitest";
import {
  MAX_SOURCE_LINES,
  SOURCE_MAX_CHARS,
  createShareId,
  encodeShareId,
  isShareId,
  parseShareSource,
} from "../src/security.js";

describe("share ids", () => {
  it("encodes 128 bits as unpadded base64url", () => {
    expect(encodeShareId(new Uint8Array(16).fill(0))).toBe("A".repeat(22));
    expect(
      encodeShareId(Uint8Array.from([0xfb, 0xff, 0xbf, ...new Uint8Array(13)])),
    ).toMatch(/^[-_A-Za-z0-9]+$/);
    const mixed = encodeShareId(
      Uint8Array.from([0xfb, 0xef, 0xbf, ...new Uint8Array(13).fill(1)]),
    );
    expect(mixed).not.toMatch(/[+/=]/);
    expect(mixed).toHaveLength(22);
  });

  it("rejects a byte length other than 16", () => {
    expect(() => encodeShareId(new Uint8Array(15))).toThrow(/16/);
  });

  it("mints ids in the allowed charset", () => {
    const ids = new Set(Array.from({ length: 20 }, () => createShareId()));
    expect(ids.size).toBe(20);
    for (const id of ids) {
      expect(isShareId(id)).toBe(true);
      expect(id).toHaveLength(22);
    }
  });

  it("rejects empty, dotted, and injected ids", () => {
    expect(isShareId("")).toBe(false);
    expect(isShareId("abc.svg")).toBe(false);
    expect(isShareId("id' OR 1=1")).toBe(false);
    expect(isShareId("../etc")).toBe(false);
    expect(isShareId("abc_XYZ-12")).toBe(true);
  });
});

describe("parseShareSource", () => {
  it("accepts a non-empty string source", () => {
    expect(parseShareSource({ source: "provider aws" })).toEqual({
      ok: true,
      source: "provider aws",
    });
  });

  it("rejects missing or non-string source", () => {
    expect(parseShareSource(null).ok).toBe(false);
    expect(parseShareSource({}).ok).toBe(false);
    expect(parseShareSource({ source: 1 })).toEqual({
      ok: false,
      status: 400,
      error: "invalid_request",
    });
    expect(parseShareSource({ source: "  " })).toMatchObject({ status: 400 });
  });

  it("caps source length and does not return the source", () => {
    const tooBig = parseShareSource({
      source: "x".repeat(SOURCE_MAX_CHARS + 1),
    });
    expect(tooBig).toEqual({
      ok: false,
      status: 413,
      error: "payload_too_large",
    });
    expect(JSON.stringify(tooBig)).not.toContain("xxx");
    expect(parseShareSource({ source: "x".repeat(SOURCE_MAX_CHARS) }).ok).toBe(
      true,
    );
  });

  it("caps source at 2,000 logical lines, including a trailing newline", () => {
    const withinLimit = `${Array.from({ length: MAX_SOURCE_LINES }, () => "x").join("\n")}\n`;
    const overLimit = Array.from(
      { length: MAX_SOURCE_LINES + 1 },
      () => "x",
    ).join("\n");

    expect(parseShareSource({ source: withinLimit }).ok).toBe(true);
    expect(parseShareSource({ source: overLimit })).toEqual({
      ok: false,
      status: 413,
      error: "diagram_too_large",
    });
  });
});
