import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRenderCommand } from "../packages/cli/src/commands/render.js";
import { createValidateCommand } from "../packages/cli/src/commands/validate.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((dir) => rm(dir, { recursive: true })),
  );
});

async function writeDiagram(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "archlex-cf-"));
  directories.push(dir);
  const input = join(dir, "diagram.archlex");
  await writeFile(input, source);
  return input;
}

async function runCommand(
  command: "render" | "validate",
  args: string[],
): Promise<string> {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...parts: unknown[]) => {
    logs.push(parts.map(String).join(" "));
  };
  try {
    const cmd =
      command === "render" ? createRenderCommand() : createValidateCommand();
    cmd.exitOverride();
    await cmd.parseAsync(args, { from: "user" });
  } finally {
    console.log = original;
  }
  return logs.join("\n");
}

describe("Cloudflare CLI", () => {
  it("renders a Cloudflare Workers diagram and a qualified mixed resource", async () => {
    const cloudflare = await writeDiagram("provider cloudflare\nworkers");
    const cloudflareSvg = cloudflare.replace(/\.archlex$/, ".svg");
    const cloudflareLog = await runCommand("render", [
      cloudflare,
      "-o",
      cloudflareSvg,
      "--validation",
      "normal",
    ]);
    const cloudflareOutput = await readFile(cloudflareSvg, "utf8");

    expect(cloudflareLog).not.toContain("Unknown service type 'workers'");
    expect(cloudflareOutput).toContain("Workers");

    const mixed = await writeDiagram("provider aws\ncloudflare.workers > rds");
    const mixedSvg = mixed.replace(/\.archlex$/, ".svg");
    const mixedLog = await runCommand("render", [
      mixed,
      "-o",
      mixedSvg,
      "--validation",
      "normal",
    ]);
    const mixedOutput = await readFile(mixedSvg, "utf8");

    expect(mixedLog).not.toContain("Unknown service type 'workers'");
    expect(mixedOutput).toContain("Workers");
    expect(mixedOutput).toContain("Amazon RDS");
  });

  it("validates the same catalog and keeps unknown kinds as partial results", async () => {
    const source = await writeDiagram("provider cloudflare\nworkers");
    const validLog = await runCommand("validate", [
      source,
      "--validation",
      "normal",
    ]);

    expect(validLog).toContain("Diagram is valid");
    expect(validLog).not.toContain("Unknown service type 'workers'");

    const unknown = await writeDiagram("provider cloudflare\nnot-a-product");
    const unknownSvg = unknown.replace(/\.archlex$/, ".svg");
    const unknownLog = await runCommand("render", [
      unknown,
      "-o",
      unknownSvg,
      "--validation",
      "normal",
    ]);

    expect(unknownLog).toContain(
      "Unknown service type 'not-a-product' for provider 'cloudflare'",
    );
    expect(await readFile(unknownSvg, "utf8")).toContain("not-a-product");
  });
});
