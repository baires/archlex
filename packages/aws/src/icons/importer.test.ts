import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  generateIconModule,
  sanitizeAwsSvg,
} from "../../scripts/import-official-icons.mjs";

const fixtureEntries = [
  {
    key: "aws.rds-proxy",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/rds-proxy.svg", import.meta.url),
    ),
  },
  {
    key: "aws.ecs",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/ecs.svg", import.meta.url),
    ),
  },
  {
    key: "aws.rds",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/rds.svg", import.meta.url),
    ),
  },
] as const;

describe("sanitizeAwsSvg", () => {
  it.each([
    {
      name: "preserves a safe SVG and its viewBox",
      svg: '<svg viewBox="0 0 64 64"><path fill="#C925D1" d="M0 0h1"/></svg>',
      sourceName: "rds.svg",
      expected: {
        viewBox: "0 0 64 64",
        svg: '<svg viewBox="0 0 64 64"><path fill="#C925D1" d="M0 0h1"/></svg>',
      },
    },
  ])("$name", ({ svg, sourceName, expected }) => {
    expect(sanitizeAwsSvg(svg, sourceName)).toEqual(expected);
  });

  it("removes root sizing metadata while preserving nested artwork geometry", () => {
    const result = sanitizeAwsSvg(
      '<svg width="64px" height="64px" viewBox="0 0 64 64" version="1.1"><rect width="64" height="64" fill="#C925D1"/></svg>',
      "architecture-icon.svg",
    );

    expect(result).toEqual({
      viewBox: "0 0 64 64",
      svg: '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#C925D1"/></svg>',
    });
  });

  it("preserves inert provider gradients and filters referenced by fragment IDs", () => {
    const result = sanitizeAwsSvg(
      '<svg viewBox="0 0 64 64"><defs><linearGradient id="provider-gradient"><stop offset="0" stop-color="#C925D1"/></linearGradient><filter id="provider-filter"><feGaussianBlur stdDeviation="1"/></filter></defs><path fill="url(#provider-gradient)" filter="url(#provider-filter)" d="M0 0h1"/></svg>',
      "provider-effects.svg",
    );

    expect(result.svg).toContain('<linearGradient id="provider-gradient">');
    expect(result.svg).toContain('<filter id="provider-filter">');
    expect(result.svg).toContain('fill="url(#provider-gradient)"');
    expect(result.svg).toContain('filter="url(#provider-filter)"');
  });

  it("rejects prefixed foreign content after XML namespace resolution", () => {
    const unsafe = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xht&#x6d;l" viewBox="0 0 1 1"><s:foreignObject><x:iframe srcdoc="&lt;script>parent.compromised=true&lt;/script>"/></s:foreignObject></svg>`;

    expect(() => sanitizeAwsSvg(unsafe, "prefixed-foreign.svg")).toThrow(
      /prefixed-foreign\.svg.*(?:namespace|foreignObject|iframe)/i,
    );
  });

  it("rejects document type and custom entity declarations before expansion", () => {
    const unsafe = `<!DOCTYPE svg [<!ENTITY xhtml "http://www.w3.org/1999/xhtml">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:x="&xhtml;" viewBox="0 0 1 1"><x:iframe/></svg>`;

    expect(() => sanitizeAwsSvg(unsafe, "entity-obfuscated.svg")).toThrow(
      /entity-obfuscated\.svg.*(?:DOCTYPE|entity)/i,
    );
  });

  it("rejects XML base URLs and entity-decoded non-fragment IRIs", () => {
    expect(() =>
      sanitizeAwsSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://attacker.invalid/" viewBox="0 0 1 1"><use href="#shape"/></svg>',
        "xml-base.svg",
      ),
    ).toThrow(/xml-base\.svg.*xml:base/i);

    expect(() =>
      sanitizeAwsSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><use href="jav&#x61;script:alert(1)"/></svg>',
        "decoded-iri.svg",
      ),
    ).toThrow(/decoded-iri\.svg.*(?:reference|href|IRI)/i);
  });

  it("canonically serializes equivalent safe SVG trees", () => {
    const first = sanitizeAwsSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="#C925D1" d="M0 0h2v2z"/></svg>',
      "first.svg",
    );
    const second = sanitizeAwsSvg(
      '<svg viewBox="0 0 2 2" xmlns="http://www.w3.org/2000/svg">\n  <path d="M0 0h2v2z" fill="#C925D1"></path>\n</svg>',
      "second.svg",
    );

    expect(second.svg).toBe(first.svg);
  });

  it.each([
    {
      name: "rejects scripts",
      svg: "<svg><script>alert(1)</script></svg>",
      sourceName: "unsafe.svg",
      error: /unsafe\.svg.*script/i,
    },
    {
      name: "rejects external references",
      svg: '<svg viewBox="0 0 1 1"><use href="https://example.com/x.svg#x"/></svg>',
      sourceName: "external.svg",
      error: /external\.svg.*external/i,
    },
    {
      name: "rejects data URL references",
      svg: '<svg viewBox="0 0 1 1"><image href="data:image/svg+xml;base64,PHN2Zy8+"/></svg>',
      sourceName: "data-url.svg",
      error: /data-url\.svg.*external/i,
    },
    {
      name: "rejects relative external references",
      svg: '<svg viewBox="0 0 1 1"><use href="other.svg#symbol"/></svg>',
      sourceName: "relative.svg",
      error: /relative\.svg.*external/i,
    },
    {
      name: "rejects root-relative external references",
      svg: '<svg viewBox="0 0 1 1"><image href="/asset.svg"/></svg>',
      sourceName: "root-relative.svg",
      error: /root-relative\.svg.*external/i,
    },
    {
      name: "rejects parent-relative xlink references",
      svg: '<svg viewBox="0 0 1 1" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="../x.svg#id"/></svg>',
      sourceName: "parent-relative.svg",
      error: /parent-relative\.svg.*external/i,
    },
    {
      name: "rejects entity-encoded external references",
      svg: '<svg viewBox="0 0 1 1"><use href="jav&#x61;script:alert(1)"/></svg>',
      sourceName: "encoded.svg",
      error: /encoded\.svg.*external/i,
    },
    {
      name: "rejects CSS keyframe animation",
      svg: '<svg viewBox="0 0 1 1"><style>@keyframes spin { to { transform: rotate(1turn); } }</style></svg>',
      sourceName: "animated.css.svg",
      error: /animated\.css\.svg.*style/i,
    },
    {
      name: "rejects inline CSS animation",
      svg: '<svg viewBox="0 0 1 1"><path style="animation: spin 1s infinite"/></svg>',
      sourceName: "inline-animated.svg",
      error: /inline-animated\.svg.*style/i,
    },
    {
      name: "rejects event attributes",
      svg: '<svg viewBox="0 0 1 1" onload="x()"/>',
      sourceName: "event.svg",
      error: /event\.svg.*event/i,
    },
    {
      name: "rejects SVGs without geometry",
      svg: "<svg><path/></svg>",
      sourceName: "geometry.svg",
      error: /geometry\.svg.*viewBox/i,
    },
  ])("$name", ({ svg, sourceName, error }) => {
    expect(() => sanitizeAwsSvg(svg, sourceName)).toThrow(error);
  });
});

describe("generateIconModule", () => {
  it("sorts a shuffled icon set into byte-identical modules with stable SHA-256 checksums", async () => {
    const first = await generateIconModule(fixtureEntries);
    const second = await generateIconModule(fixtureEntries);

    const firstChecksum = createHash("sha256").update(first).digest("hex");
    const secondChecksum = createHash("sha256").update(second).digest("hex");

    expect(second).toBe(first);
    expect(secondChecksum).toBe(firstChecksum);
    expect(firstChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toMatch(
      /"aws\.ecs": \{[\s\S]*"aws\.rds": \{[\s\S]*"aws\.rds-proxy": \{/,
    );
    expect(first.match(/"checksum": "[a-f0-9]{64}"/g)).toHaveLength(3);
  });
});
