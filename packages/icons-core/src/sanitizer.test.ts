import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitizer.js";

const SAFE_SVG =
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="#fff"/></svg>';

describe("sanitizeSvg", () => {
  it("returns a stable Web Crypto checksum", async () => {
    const a = await sanitizeSvg("aws", "lambda", SAFE_SVG);
    const b = await sanitizeSvg("aws", "lambda", SAFE_SVG);
    expect(a.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(a).toEqual(b);
  });

  it.each([
    "<script>alert(1)</script>",
    "onclick='alert(1)'",
    "<!DOCTYPE svg>",
  ])("rejects active SVG content: %s", async (payload) => {
    await expect(
      sanitizeSvg("aws", "bad", `<svg viewBox="0 0 24 24">${payload}</svg>`),
    ).rejects.toThrow();
  });

  it("rejects SVG payloads above the configured byte limit", async () => {
    await expect(
      sanitizeSvg("aws", "large", SAFE_SVG, { maxBytes: 8 }),
    ).rejects.toThrow("exceeds 8 bytes");
  });
});
