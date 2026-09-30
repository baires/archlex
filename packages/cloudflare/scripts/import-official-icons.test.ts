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
