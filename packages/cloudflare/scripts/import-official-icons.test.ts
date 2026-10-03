import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateIcons, runImporter } from "./import-official-icons.mjs";

const directories: string[] = [];
const source =
  '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2 2H22V22H2ZM7 7H17V17H7Z"/></svg>';
const service = { id: "sample", iconKey: "cloudflare.sample" };
const revision = "48f601bf4293fa9032505f858656d0db5b559131";
async function fixture(raw = source) {
  const sourceDirectory = await mkdtemp(join(tmpdir(), "cloudflare-import-"));
  directories.push(sourceDirectory);
  await writeFile(join(sourceDirectory, "sample.svg"), raw);
  return {
    services: [service],
    pins: {
      sample: {
        revision,
        sourcePath: "src/icons/sample.svg",
        sha256: createHash("sha256").update(raw).digest("hex"),
      },
    },
    sourceDirectory,
    outputPath: join(sourceDirectory, "generated.ts"),
  };
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("offline Cloudflare icon importer", () => {
  it("generates byte-identical attributed artwork without network requests", async () => {
    const options = await fixture();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const first = await generateIcons(options);
    expect(await generateIcons(options)).toBe(first);
    expect(first).toContain("fill-rule");
    expect(first).toContain("CC BY 4.0");
    expect(first).toContain('fill="#fff"');
    expect(first).toContain('fill="#f6821f"');
    expect(first).toContain(revision);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("checks drift without rewriting", async () => {
    const options = await fixture();
    await runImporter(options);
    await runImporter({ ...options, check: true });
    await writeFile(options.outputPath, "drift");
    await expect(runImporter({ ...options, check: true })).rejects.toThrow(
      "Generated artwork drift",
    );
    expect(await readFile(options.outputPath, "utf8")).toBe("drift");
  });
  it("rejects missing mappings and checksum mismatch", async () => {
    const options = await fixture();
    await expect(generateIcons({ ...options, pins: {} })).rejects.toThrow(
      "Missing artwork pin",
    );
    await writeFile(join(options.sourceDirectory, "sample.svg"), `${source} `);
    await expect(generateIcons(options)).rejects.toThrow(
      "Source checksum mismatch",
    );
  });
  it("rejects unsafe SVG and unpinned revisions", async () => {
    const options = await fixture(
      '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
    );
    await expect(generateIcons(options)).rejects.toThrow();
    options.pins.sample.revision = "production";
    await expect(generateIcons(options)).rejects.toThrow(
      "Invalid pinned provenance",
    );
  });
  it("rejects orphan source assets and paths outside the pinned icon directory", async () => {
    const options = await fixture();
    await writeFile(join(options.sourceDirectory, "logo.svg"), source);
    await expect(generateIcons(options)).rejects.toThrow(
      "Unmapped source artwork",
    );
    await rm(join(options.sourceDirectory, "logo.svg"));
    options.pins.sample.sourcePath = "src/icons/../secret.svg";
    await expect(generateIcons(options)).rejects.toThrow(
      "Invalid pinned provenance",
    );
  });
});

it("recolors monochrome ink and keeps white clip fills", async () => {
  const options = await fixture(
    '<svg viewBox="0 0 24 24"><path fill="#000" d="M1 1H2V2H1Z"/><path fill="currentColor" d="M3 3H4V4H3Z"/><clipPath id="c"><path fill="#fff" d="M0 0H24V24H0Z"/></clipPath></svg>',
  );
  const generated = await generateIcons(options);
  expect(generated).toContain('fill="#f6821f"');
  expect(generated).toContain(
    '<clipPath id="c"><path d="M0 0H24V24H0Z" fill="#fff"/>',
  );
  expect(generated).not.toContain('fill="#000"');
  expect(generated).not.toContain("currentColor");
  expect(generated).not.toContain("colors retained");
});

it("retains inherited presentation when renderer extracts SVG children", async () => {
  const options = await fixture(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 2H22V22H2Z"/></svg>',
  );
  await runImporter(options);
  const generated = await readFile(options.outputPath, "utf8");
  expect(generated).toContain(
    '<g fill="none" stroke="#f6821f" stroke-width="2">',
  );
  expect(generated).toContain('fill="#fff"');
  expect(generated).not.toContain("currentColor");
});

it("rejects coherent included-resource deletions and unexpected resources", async () => {
  const options = await fixture();
  await expect(
    generateIcons({ ...options, requiredIds: ["sample", "missing"] }),
  ).rejects.toThrow("Missing included resource: missing");
  await expect(generateIcons({ ...options, requiredIds: [] })).rejects.toThrow(
    "Excluded or unknown resource: sample",
  );
});
