import { validateSvgSafety } from "@cloudmer/core/browser";
import { describe, expect, it } from "vitest";

describe("Phase 4: SVG Mounting Safety", () => {
  it("passes clean SVG strings", () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg"><g><rect width="10" height="10"/></g></svg>`;
    expect(() => validateSvgSafety(cleanSvg)).not.toThrow();
  });

  it("rejects script tags", () => {
    const unsafeSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('xss')</script></svg>`;
    expect(() => validateSvgSafety(unsafeSvg)).toThrow("Safety check failed");
  });

  it("rejects inline event handlers", () => {
    const unsafeSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert('xss')"/></svg>`;
    expect(() => validateSvgSafety(unsafeSvg)).toThrow("Safety check failed");
  });

  it("rejects external HTTP resource links", () => {
    const unsafeSvg = `<svg xmlns="http://www.w3.org/2000/svg"><image href="http://malicious.com/pixel.png"/></svg>`;
    expect(() => validateSvgSafety(unsafeSvg)).toThrow("Safety check failed");
  });
});
