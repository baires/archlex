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
      svg: '<svg viewBox="0 0 1 1"><use xlink:href="../x.svg#id"/></svg>',
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
