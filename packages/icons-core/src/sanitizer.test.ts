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

  it.each([
    "u\\72 l(//attacker.example/x.svg)",
    "u\\72 l(//attacker.example/x.svg#p)",
  ])("rejects escaped CSS URL syntax: %s", async (value) => {
    await expect(
      sanitizeSvg(
        "aws",
        "escaped-url",
        `<svg viewBox="0 0 24 24"><path fill="${value}"/></svg>`,
      ),
    ).rejects.toThrow("Only local fragment references are allowed");
  });

  it.each(["#4285F4", "currentColor", "none", "url(#local-id)"])(
    "retains safe URI-capable paint values: %s",
    async (value) => {
      const icon = await sanitizeSvg(
        "aws",
        "safe-paint",
        `<svg viewBox="0 0 24 24"><path fill="${value}"/></svg>`,
      );
      expect(icon.svgFragment).toContain(`fill="${value}"`);
    },
  );

  it("converts inline style presentation properties to SVG attributes", async () => {
    const icon = await sanitizeSvg(
      "gcp",
      "private-service-connect",
      '<svg viewBox="0 0 24 24"><path d="M0 0h10v10H0z" style="fill:#669df6; stroke:#4285f4"/></svg>',
    );
    expect(icon.svgFragment).toContain('fill="#669df6"');
    expect(icon.svgFragment).toContain('stroke="#4285f4"');
    expect(icon.svgFragment).not.toContain("style=");
  });

  it("drops inert Inkscape and RDF editor metadata", async () => {
    const icon = await sanitizeSvg(
      "k8s",
      "deployment",
      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <sodipodi:namedview id="editor-state" />
        <metadata><rdf:RDF><rdf:Description /></rdf:RDF></metadata>
        <path d="M0 0h24v24H0z" style="fill:#326ce5" />
      </svg>`,
    );

    expect(icon.svgFragment).not.toContain("namedview");
    expect(icon.svgFragment).not.toContain("metadata");
    expect(icon.svgFragment).not.toContain("rdf:");
    expect(icon.svgFragment).toContain('fill="#326ce5"');
  });
});
