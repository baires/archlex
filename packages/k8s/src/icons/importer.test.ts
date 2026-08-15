import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  generateIconModule,
  sanitizeK8sSvg,
} from "../../scripts/import-official-icons.mjs";

const EXPECTED_MANIFEST_CHECKSUM =
  "04055b8fc67498c320c61e2d623b7f45c9785fc718bc576430786d6e75d75dd9";

const fixtureEntries = [
  {
    key: "k8s.deployment",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/deployment.svg", import.meta.url),
    ),
  },
  {
    key: "k8s.pod",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/pod.svg", import.meta.url),
    ),
  },
  {
    key: "k8s.service",
    sourcePath: fileURLToPath(
      new URL("../../assets/official/service.svg", import.meta.url),
    ),
  },
] as const;

describe("sanitizeK8sSvg", () => {
  it.each([
    {
      name: "preserves a safe SVG and its viewBox",
      svg: '<svg viewBox="0 0 64 64"><path fill="#326CE5" d="M0 0h1"/></svg>',
      sourceName: "pod.svg",
      expected: {
        viewBox: "0 0 64 64",
        svg: '<svg viewBox="0 0 64 64"><path fill="#326CE5" d="M0 0h1"/></svg>',
      },
    },
  ])("$name", ({ svg, sourceName, expected }) => {
    expect(sanitizeK8sSvg(svg, sourceName)).toEqual(expected);
  });

  it("converts Inkscape inline styles into plain presentation attributes", () => {
    const result = sanitizeK8sSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 24 24"><path inkscape:connector-curvature="0" style="fill:#326ce5;fill-opacity:1;stroke:none" d="M0 0h24"/></svg>',
      "inkscape-styled.svg",
    );

    expect(result.svg).not.toMatch(/\sstyle=/);
    expect(result.svg).not.toMatch(/\s(?:inkscape|sodipodi):/);
    expect(result.svg).toContain(
      '<path fill="#326ce5" fill-opacity="1" stroke="none" d="M0 0h24"/>',
    );
  });

  it("drops typographic and bookkeeping style properties", () => {
    const result = sanitizeK8sSvg(
      '<svg viewBox="0 0 24 24"><path style="color:#000000;font-style:normal;letter-spacing:normal;fill:#ffffff;marker:none;enable-background:accumulate" d="M0 0h24"/></svg>',
      "bookkeeping-style.svg",
    );

    expect(result.svg).toContain('fill="#ffffff"');
    expect(result.svg).not.toContain("letter-spacing");
    expect(result.svg).not.toContain("marker");
  });

  it("removes RDF metadata and sodipodi namedview containers", () => {
    const result = sanitizeK8sSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" viewBox="0 0 24 24"><sodipodi:namedview id="base"/><metadata><rdf:RDF/></metadata><path d="M0 0h24"/></svg>',
      "inkscape-containers.svg",
    );

    expect(result.svg).toBe(
      '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>',
    );
  });

  it("unwraps hyperlink wrappers and drops embedded label text", () => {
    const result = sanitizeK8sSvg(
      '<svg viewBox="0 0 24 24"><a id="a1"><path style="fill:#326ce5" d="M0 0h24"/></a><text id="t1" x="1" y="2">Pod</text></svg>',
      "labeled.svg",
    );

    expect(result.svg).toContain('<path fill="#326ce5" d="M0 0h24"/>');
    expect(result.svg).not.toContain("<a");
    expect(result.svg).not.toContain("<text");
    expect(result.svg).not.toContain("Pod");
  });

  it("drops inert text-anchor and pointer-events leftovers", () => {
    const result = sanitizeK8sSvg(
      '<svg viewBox="0 0 24 24"><path text-anchor="middle" pointer-events="none" d="M0 0h24"/></svg>',
      "inert-attrs.svg",
    );

    expect(result.svg).toBe(
      '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>',
    );
  });

  it.each([
    {
      name: "rejects content-hiding display values",
      svg: '<svg viewBox="0 0 1 1"><path style="display:none" d="M0 0h1"/></svg>',
      sourceName: "hidden.svg",
      error: /hidden\.svg.*display/i,
    },
    {
      name: "rejects external CSS references",
      svg: '<svg viewBox="0 0 1 1"><path style="fill:url(https://attacker.invalid/x.svg#x)" d="M0 0h1"/></svg>',
      sourceName: "external-css.svg",
      error: /external-css\.svg.*(?:forbidden|external|IRI)/i,
    },
  ])("$name", ({ svg, sourceName, error }) => {
    expect(() => sanitizeK8sSvg(svg, sourceName)).toThrow(error);
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
      sanitizeK8sSvg(
        `<svg viewBox="${viewBox}"><path d="M0 0h1"/></svg>`,
        "invalid-viewbox.svg",
      ),
    ).toThrow(/invalid-viewbox\.svg.*viewBox/i);
  });

  it("preserves inert provider gradients and filters referenced by fragment IDs", () => {
    const result = sanitizeK8sSvg(
      '<svg viewBox="0 0 64 64"><defs><linearGradient id="provider-gradient"><stop offset="0" stop-color="#326CE5"/></linearGradient><filter id="provider-filter"><feGaussianBlur stdDeviation="1"/></filter></defs><path fill="url(#provider-gradient)" filter="url(#provider-filter)" d="M0 0h1"/></svg>',
      "provider-effects.svg",
    );

    expect(result.svg).toContain('<linearGradient id="provider-gradient">');
    expect(result.svg).toContain('<filter id="provider-filter">');
    expect(result.svg).toContain('fill="url(#provider-gradient)"');
    expect(result.svg).toContain('filter="url(#provider-filter)"');
  });

  it("rejects document type and custom entity declarations before expansion", () => {
    const unsafe = `<!DOCTYPE svg [<!ENTITY xhtml "http://www.w3.org/1999/xhtml">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:x="&xhtml;" viewBox="0 0 1 1"><x:iframe/></svg>`;

    expect(() => sanitizeK8sSvg(unsafe, "entity-obfuscated.svg")).toThrow(
      /entity-obfuscated\.svg.*(?:DOCTYPE|entity)/i,
    );
  });

  it("canonically serializes equivalent safe SVG trees", () => {
    const first = sanitizeK8sSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="#326CE5" d="M0 0h2v2z"/></svg>',
      "first.svg",
    );
    const second = sanitizeK8sSvg(
      '<svg viewBox="0 0 2 2" xmlns="http://www.w3.org/2000/svg">\n  <path d="M0 0h2v2z" fill="#326CE5"></path>\n</svg>',
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
      name: "rejects SVGs without geometry",
      svg: "<svg><path/></svg>",
      sourceName: "geometry.svg",
      error: /geometry\.svg.*viewBox/i,
    },
  ])("$name", ({ svg, sourceName, error }) => {
    expect(() => sanitizeK8sSvg(svg, sourceName)).toThrow(error);
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
      /"k8s\.deployment": \{[\s\S]*"k8s\.pod": \{[\s\S]*"k8s\.service": \{/,
    );
    expect(first.match(/"checksum": "[a-f0-9]{64}"/g)).toHaveLength(3);
    expect(first).toContain(
      `export const K8S_GENERATED_ICON_MANIFEST_CHECKSUM =\n  "${EXPECTED_MANIFEST_CHECKSUM}" as const;`,
    );
  });

  it("includes the icon key and source path when reading an icon fails", async () => {
    const missingPath = fileURLToPath(
      new URL("../../assets/official/missing.svg", import.meta.url),
    );

    await expect(
      generateIconModule([{ key: "k8s.missing", sourcePath: missingPath }]),
    ).rejects.toThrow(/k8s\.missing.*missing\.svg/i);
  });

  it("includes the icon key and source path when sanitizing an icon fails", async () => {
    const invalidPath = fileURLToPath(
      new URL("../../package.json", import.meta.url),
    );

    await expect(
      generateIconModule([{ key: "k8s.invalid", sourcePath: invalidPath }]),
    ).rejects.toThrow(/k8s\.invalid.*package\.json/i);
  });
});
