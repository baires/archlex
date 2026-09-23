import { describe, expect, it } from "vitest";
import { sanitizeDiagramSvg } from "../src/sanitize-svg.js";

const SAFE = `<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0"/><text>hi</text><use href="#icon"/></g></svg>`;

describe("sanitizeDiagramSvg", () => {
  it("strips script and keeps diagram markup", () => {
    const cleaned = sanitizeDiagramSvg(
      `${SAFE.slice(0, -6)}<script>alert(1)</script></svg>`,
    );

    expect(cleaned).not.toContain("script");
    expect(cleaned).not.toContain("alert");
    expect(cleaned).toContain("<g");
    expect(cleaned).toContain("<path");
    expect(cleaned).toContain("<text");
    expect(cleaned).toContain("<use");
  });

  it("strips foreignObject, event handlers, and javascript urls", () => {
    const cleaned = sanitizeDiagramSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)"><foreignObject><iframe></iframe></foreignObject><a href=" javascript:alert(1)"><text>x</text></a><use xlink:href="JAVASCRIPT:alert(2)"/></svg>`,
    );

    expect(cleaned.toLowerCase()).not.toContain("foreignobject");
    expect(cleaned.toLowerCase()).not.toContain("onload");
    expect(cleaned.toLowerCase()).not.toContain("javascript:");
    expect(cleaned).toContain("<text");
  });

  it("returns an empty svg when the markup cannot be parsed", () => {
    const cleaned = sanitizeDiagramSvg("<svg><g></svg>");
    expect(cleaned).not.toContain("<g");
    expect(cleaned).toContain("<svg");
  });
});
