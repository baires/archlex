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

  it.each([
    ["fill", "url(icon.svg#paint)"],
    ["filter", "url(//attacker.example/filter.svg#x)"],
    ["mask", "url(https://attacker.example/mask.svg#x)"],
    ["clip-path", "url(../clip.svg#x)"],
  ])("rejects non-local URI references in %s: %s", async (attribute, value) => {
    await expect(
      sanitizeSvg(
        "aws",
        "external-reference",
        `<svg viewBox="0 0 24 24"><path ${attribute}="${value}"/></svg>`,
      ),
    ).rejects.toThrow("Only local fragment references are allowed");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid maxBytes option: %s",
    async (maxBytes) => {
      await expect(
        sanitizeSvg("aws", "invalid-limit", SAFE_SVG, { maxBytes }),
      ).rejects.toThrow("maxBytes must be a finite, non-negative integer");
    },
  );
});
