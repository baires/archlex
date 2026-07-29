import { validateSvgSafety } from "@cloudmer/core/browser";
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubGlobal("DOMParser", XmlDomParser);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

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

  it("allows inert fragment-local gradients and filters", () => {
    const safeSvg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="paint"><stop offset="0" stop-color="#fff"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="1"/></filter></defs><path fill="url(#paint)" filter="url(#soft)" d="M0 0h1"/></svg>`;

    expect(() => validateSvgSafety(safeSvg)).not.toThrow();
  });

  it("rejects prefixed foreign namespaces and entity-obfuscated XHTML", () => {
    const unsafeSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xht&#x6d;l"><s:foreignObject><x:iframe srcdoc="&lt;script>parent.compromised=true&lt;/script>"/></s:foreignObject></svg>`;

    expect(() => validateSvgSafety(unsafeSvg)).toThrow("Safety check failed");
  });

  it("rejects document types, custom entities, and xml:base", () => {
    const entitySvg = `<!DOCTYPE svg [<!ENTITY xhtml "http://www.w3.org/1999/xhtml">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:x="&xhtml;"><x:iframe/></svg>`;
    const basedSvg = `<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://attacker.invalid/"><use href="#shape"/></svg>`;

    expect(() => validateSvgSafety(entitySvg)).toThrow("Safety check failed");
    expect(() => validateSvgSafety(basedSvg)).toThrow("Safety check failed");
  });

  it("rejects entity-decoded and relative non-fragment references", () => {
    const encodedSvg = `<svg xmlns="http://www.w3.org/2000/svg"><use href="jav&#x61;script:alert(1)"/></svg>`;
    const relativeSvg = `<svg xmlns="http://www.w3.org/2000/svg"><use href="other.svg#shape"/></svg>`;

    expect(() => validateSvgSafety(encodedSvg)).toThrow("Safety check failed");
    expect(() => validateSvgSafety(relativeSvg)).toThrow("Safety check failed");
  });
});
