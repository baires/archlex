import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { createValidateCommand } from "../packages/cli/src/commands/validate.js";

describe("Catalog Validation CLI & Standalone Script", () => {
  it("runs scripts/validate-catalog.mjs synchronously and reports catalog status", () => {
    let output = "";
    try {
      output = execSync("node scripts/validate-catalog.mjs", {
        encoding: "utf-8",
      });
    } catch (error: unknown) {
      const err = error as { stdout?: string; message?: string };
      output = err.stdout || err.message || "";
    }

    expect(output).toContain("Catalog Validation Report");
    expect(output).toContain("AWS Catalog:");
    expect(output).toContain("GCP Catalog:");
    expect(output).toMatch(/AWS Catalog:\s*\d+\s*services/i);
    expect(output).toMatch(/GCP Catalog:\s*\d+\s*services/i);
  });

  it("validates catalog via archlex validate --catalog command function with catalog option", async () => {
    const cmd = createValidateCommand();
    cmd.exitOverride();
    const catalogOpt = cmd.options.find((o) => o.long === "--catalog");
    expect(catalogOpt).toBeDefined();

    let output = "";
    try {
      output = execSync("node packages/cli/dist/index.js validate --catalog", {
        encoding: "utf-8",
      });
    } catch (error: unknown) {
      const err = error as { stdout?: string; message?: string };
      output = err.stdout || err.message || "";
    }

    expect(output).toContain("Catalog Validation Report");
    expect(output).toContain("AWS Catalog:");
    expect(output).toContain("GCP Catalog:");
  });
});
