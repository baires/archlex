import { describe, expect, it } from "vitest";
import { renderDiagramSvg } from "../src/render.js";
import { sanitizeDiagramSvg } from "../src/sanitize-svg.js";

const EMPTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg"/>`;
const SAFE = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><path id="icon" d="M0 0"/></defs><g data-archlex-node="n1"><path d="M0 0"/><text>hi</text><use href="#icon"/><use xlink:href="#icon"/></g></svg>`;

describe("sanitizeDiagramSvg", () => {
  it("preserves allowed diagram markup and local fragment references", () => {
    const cleaned = sanitizeDiagramSvg(SAFE);

    expect(cleaned).toContain("<g");
    expect(cleaned).toContain("<path");
    expect(cleaned).toContain("<text");
    expect(cleaned).toContain('<use href="#icon"');
    expect(cleaned).toContain('xlink:href="#icon"');
    expect(cleaned).toContain('data-archlex-node="n1"');
  });

  it.each([
    ["script", `<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>`],
    [
      "foreignObject",
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>`,
    ],
    [
      "event handlers",
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`,
    ],
    [
      "javascript hrefs",
      `<svg xmlns="http://www.w3.org/2000/svg"><use href="javascript:alert(1)"/></svg>`,
    ],
    [
      "SMIL set",
      `<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="onmouseover" to="alert(1)"/></svg>`,
    ],
    [
      "SMIL animate",
      `<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="javascript:alert(1)"/></svg>`,
    ],
    [
      "external images",
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.test/image.svg"/></svg>`,
    ],
    [
      "style elements",
      `<svg xmlns="http://www.w3.org/2000/svg"><style/></svg>`,
    ],
    [
      "base elements",
      `<svg xmlns="http://www.w3.org/2000/svg"><base href="https://example.test/"/></svg>`,
    ],
    [
      "external fragment variants",
      `<svg xmlns="http://www.w3.org/2000/svg"><use href="//example.test/#icon"/></svg>`,
    ],
  ])("returns the empty SVG for %s", (_label, svg) => {
    expect(sanitizeDiagramSvg(svg)).toBe(EMPTY_SVG);
  });

  it.each([
    [
      "a second root",
      `<svg xmlns="http://www.w3.org/2000/svg"/><svg xmlns="http://www.w3.org/2000/svg"/>`,
    ],
    [
      "a foreign namespace",
      `<svg xmlns="http://www.w3.org/2000/svg"><x:script xmlns:x="urn:evil"/></svg>`,
    ],
    [
      "xml:base",
      `<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://example.test/"/>`,
    ],
  ])("returns the empty SVG for %s", (_label, svg) => {
    expect(sanitizeDiagramSvg(svg)).toBe(EMPTY_SVG);
  });

  it("returns the empty svg when the markup cannot be parsed", () => {
    expect(sanitizeDiagramSvg("<svg><g></svg>")).toBe(EMPTY_SVG);
  });

  it("accepts a normally rendered diagram", async () => {
    const rendered = await renderDiagramSvg(
      'provider aws\napi: api-gateway["API"]\nworker: lambda["Worker"]\napi -[invokes]-> worker',
    );

    expect(rendered).toContain("<svg");
    expect(rendered).toMatch(/<(?:path|use)\b/);
  });
});
