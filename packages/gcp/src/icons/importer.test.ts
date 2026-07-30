import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  generateIconModule,
  sanitizeGcpSvg,
} from "../../scripts/import-official-icons.mjs";

const EXPECTED_MANIFEST_CHECKSUM =
  "e4f1dbc3ddf17c94766dde18df880e607b54ff79179986652eb853743411b2e5";

const fixtureEntries = [
  {
    key: "gcp.cloud-sql",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/cloud-sql.svg", import.meta.url),
    ),
  },
  {
    key: "gcp.compute-engine",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/compute-engine.svg", import.meta.url),
    ),
  },
  {
    key: "gcp.pubsub",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/pubsub.svg", import.meta.url),
    ),
  },
] as const;

describe("sanitizeGcpSvg", () => {
  it.each([
    {
      name: "preserves a safe SVG and its viewBox",
      svg: '<svg viewBox="0 0 64 64"><path fill="#4285F4" d="M0 0h1"/></svg>',
      sourceName: "cloud-sql.svg",
      expected: {
        viewBox: "0 0 64 64",
        svg: '<svg viewBox="0 0 64 64"><path fill="#4285F4" d="M0 0h1"/></svg>',
      },
    },
  ])("$name", ({ svg, sourceName, expected }) => {
    expect(sanitizeGcpSvg(svg, sourceName)).toEqual(expected);
  });

  it("inlines presentational <style> classes into plain attributes", () => {
    const result = sanitizeGcpSvg(
      '<svg viewBox="0 0 24 24"><defs><style>.cls-1{fill:#4285f4;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:none;}</style></defs><path class="cls-1" d="M0 0h24"/><path class="cls-2" d="M1 1h2"/></svg>',
      "styled.svg",
    );

    expect(result.svg).not.toContain("<style");
    expect(result.svg).not.toMatch(/\sclass=/);
    expect(result.svg).toContain(
      '<path fill="#4285f4" fill-rule="evenodd" d="M0 0h24"/>',
    );
    expect(result.svg).toContain(
      '<path fill="none" fill-rule="evenodd" d="M1 1h2"/>',
    );
    expect(result.svg).not.toContain("<defs");
  });

  it("supports multi-class elements and comma-grouped selectors", () => {
    const result = sanitizeGcpSvg(
      '<svg viewBox="0 0 24 24"><style>.st0,.st1{fill:#aecbfa;}.st1{opacity:0.5;}</style><rect class="st0 st1" width="24" height="24"/></svg>',
      "multi-class.svg",
    );

    expect(result.svg).toContain('fill="#aecbfa"');
    expect(result.svg).toContain('opacity="0.5"');
  });

  it("strips bookkeeping data attributes from official artwork", () => {
    const result = sanitizeGcpSvg(
      '<svg viewBox="0 0 24 24"><g data-name="Layer 2"><path fill="#4285f4" d="M0 0h24"/></g></svg>',
      "data-attrs.svg",
    );

    expect(result.svg).not.toMatch(/\sdata-[a-z-]+=/i);
    expect(result.svg).toContain('fill="#4285f4"');
  });

  it.each([
    {
      name: "rejects non-class selectors",
      svg: '<svg viewBox="0 0 1 1"><style>path{fill:red;}</style><path d="M0 0h1"/></svg>',
      sourceName: "element-selector.svg",
      error: /element-selector\.svg.*selector/i,
    },
    {
      name: "rejects unsupported CSS properties",
      svg: '<svg viewBox="0 0 1 1"><style>.cls-1{animation:spin 1s infinite;}</style><path class="cls-1" d="M0 0h1"/></svg>',
      sourceName: "animated.svg",
      error: /animated\.svg.*property/i,
    },
    {
      name: "rejects external CSS references",
      svg: '<svg viewBox="0 0 1 1"><style>.cls-1{fill:url(https://attacker.invalid/x.svg#x);}</style><path class="cls-1" d="M0 0h1"/></svg>',
      sourceName: "external-css.svg",
      error: /external-css\.svg.*(?:forbidden|external|IRI)/i,
    },
    {
      name: "rejects classes without a matching rule",
      svg: '<svg viewBox="0 0 1 1"><path class="cls-9" d="M0 0h1"/></svg>',
      sourceName: "orphan-class.svg",
      error: /orphan-class\.svg.*class/i,
    },
  ])("$name", ({ svg, sourceName, error }) => {
    expect(() => sanitizeGcpSvg(svg, sourceName)).toThrow(error);
  });

  it.each([
    ["too few numbers", "0 0 64"],
    ["too many numbers", "0 0 64 64 1"],
    ["non-numeric values", "0 0 nope 64"],
    ["non-finite values", "0 0 1e309 64"],
    ["zero width", "0 0 0 64"],
    ["negative height", "0 0 64 -1"],
  ])("rejects a viewBox with %s", (_name, viewBox) => {
    expect(() =>
      sanitizeGcpSvg(
        `<svg viewBox="${viewBox}"><path d="M0 0h1"/></svg>`,
        "invalid-viewbox.svg",
      ),
    ).toThrow(/invalid-viewbox\.svg.*viewBox/i);
  });

  it("preserves inert provider gradients and filters referenced by fragment IDs", () => {
    const result = sanitizeGcpSvg(
      '<svg viewBox="0 0 64 64"><defs><linearGradient id="provider-gradient"><stop offset="0" stop-color="#4285F4"/></linearGradient><filter id="provider-filter"><feGaussianBlur stdDeviation="1"/></filter></defs><path fill="url(#provider-gradient)" filter="url(#provider-filter)" d="M0 0h1"/></svg>',
      "provider-effects.svg",
    );

    expect(result.svg).toContain('<linearGradient id="provider-gradient">');
    expect(result.svg).toContain('<filter id="provider-filter">');
    expect(result.svg).toContain('fill="url(#provider-gradient)"');
    expect(result.svg).toContain('filter="url(#provider-filter)"');
  });

  it("rejects document type and custom entity declarations before expansion", () => {
    const unsafe = `<!DOCTYPE svg [<!ENTITY xhtml "http://www.w3.org/1999/xhtml">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:x="&xhtml;" viewBox="0 0 1 1"><x:iframe/></svg>`;

    expect(() => sanitizeGcpSvg(unsafe, "entity-obfuscated.svg")).toThrow(
      /entity-obfuscated\.svg.*(?:DOCTYPE|entity)/i,
    );
  });

  it("canonically serializes equivalent safe SVG trees", () => {
    const first = sanitizeGcpSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="#4285F4" d="M0 0h2v2z"/></svg>',
      "first.svg",
    );
    const second = sanitizeGcpSvg(
      '<svg viewBox="0 0 2 2" xmlns="http://www.w3.org/2000/svg">\n  <path d="M0 0h2v2z" fill="#4285F4"></path>\n</svg>',
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
      name: "rejects event attributes",
      svg: '<svg viewBox="0 0 1 1" onload="x()"/>',
      sourceName: "event.svg",
      error: /event\.svg.*event/i,
    },
    {
      name: "rejects inline style attributes",
      svg: '<svg viewBox="0 0 1 1"><path style="fill:red" d="M0 0h1"/></svg>',
      sourceName: "inline-style.svg",
      error: /inline-style\.svg.*style/i,
    },
    {
      name: "rejects SVGs without geometry",
      svg: "<svg><path/></svg>",
      sourceName: "geometry.svg",
      error: /geometry\.svg.*viewBox/i,
    },
  ])("$name", ({ svg, sourceName, error }) => {
    expect(() => sanitizeGcpSvg(svg, sourceName)).toThrow(error);
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
      /"gcp\.cloud-sql": \{[\s\S]*"gcp\.compute-engine": \{[\s\S]*"gcp\.pubsub": \{/,
    );
    expect(first.match(/"checksum": "[a-f0-9]{64}"/g)).toHaveLength(3);
    expect(first).toContain(
      `export const GCP_GENERATED_ICON_MANIFEST_CHECKSUM =\n  "${EXPECTED_MANIFEST_CHECKSUM}" as const;`,
    );
  });

  it("includes the icon key and source path when reading an icon fails", async () => {
    const missingPath = fileURLToPath(
      new URL("../../assets/official/missing.svg", import.meta.url),
    );

    await expect(
      generateIconModule([{ key: "gcp.missing", sourcePath: missingPath }]),
    ).rejects.toThrow(/gcp\.missing.*missing\.svg/i);
  });

  it("includes the icon key and source path when sanitizing an icon fails", async () => {
    const invalidPath = fileURLToPath(
      new URL("../../package.json", import.meta.url),
    );

    await expect(
      generateIconModule([{ key: "gcp.invalid", sourcePath: invalidPath }]),
    ).rejects.toThrow(/gcp\.invalid.*package\.json/i);
  });
});
