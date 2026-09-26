import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const scriptPath = new URL("./check-share-secrets.mjs", import.meta.url);

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "archlex-share-secrets-"));
  roots.push(root);
  mkdirSync(join(root, "apps", "share"), { recursive: true });
  writeFileSync(join(root, "apps", "share", "wrangler.json"), "{}\n");
  spawnSync("git", ["init", "--quiet", root]);
  return root;
}

function trackFixtureFile(root: string, path: string): void {
  spawnSync("git", ["-C", root, "add", path]);
}

function runChecker(root: string) {
  return spawnSync(process.execPath, [scriptPath.pathname, "--root", root], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

describe("check-share-secrets", () => {
  it("accepts origin-only .dev.vars", () => {
    const root = createFixture();
    writeFileSync(
      join(root, "apps", "share", ".dev.vars"),
      "SHARE_ORIGIN=http://localhost:8787\nPLAYGROUND_ORIGIN=http://localhost:5173\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(0);
  });

  it("rejects a service token assignment in .dev.vars without echoing it", () => {
    const root = createFixture();
    writeFileSync(
      join(root, "apps", "share", ".dev.vars"),
      `${["SHARE_SERVICE_TOKEN", "fixture-secret-value"].join("=")}\n`,
    );

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).not.toContain("fixture-secret-value");
  });

  it("rejects service token assignments in tracked files without echoing them", () => {
    const root = createFixture();
    const file = join(root, "apps", "share", "worker.ts");
    writeFileSync(
      file,
      `const ${["SHARE", "SERVICE", "TOKEN"].join("_")} = "${["tracked", "fixture", "secret"].join("-")}";\n`,
    );
    trackFixtureFile(root, "apps/share/worker.ts");

    const result = runChecker(root);

    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).not.toContain(
      "tracked-fixture-secret",
    );
  });

  it("rejects the service token name in a tracked wrangler.json", () => {
    const root = createFixture();
    writeFileSync(
      join(root, "apps", "share", "wrangler.json"),
      `{"vars":{"${["SHARE", "SERVICE", "TOKEN"].join("_")}":"fixture"}}\n`,
    );
    trackFixtureFile(root, "apps/share/wrangler.json");

    expect(runChecker(root).status).not.toBe(0);
  });
});
