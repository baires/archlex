import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  generateIconModule,
  sanitizeAwsSvg,
} from "../../scripts/import-official-icons.mjs";

const fixtureEntries = [
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
  it("generates byte-identical modules with stable SHA-256 checksums", async () => {
    const first = await generateIconModule(fixtureEntries);
    const second = await generateIconModule(fixtureEntries);

    const firstChecksum = createHash("sha256").update(first).digest("hex");
    const secondChecksum = createHash("sha256").update(second).digest("hex");

    expect(second).toBe(first);
    expect(secondChecksum).toBe(firstChecksum);
    expect(firstChecksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
