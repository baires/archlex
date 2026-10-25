import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEPENDABOT_CHANGESET_SUMMARY,
  applyDependabotChangeset,
  classifyChangedPackages,
  newDependabotChangesetPath,
  packageDirsRequiringChangeset,
  planDependabotChangeset,
  renderChangeset,
} from "../scripts/dependabot-changeset.mjs";

const manifests: Record<string, { name: string; private?: boolean }> = {
  core: { name: "@archlex/core" },
  aws: { name: "@archlex/aws" },
  design: { name: "@archlex/design", private: true },
};

function readManifest(dir: string) {
  const manifest = manifests[dir];
  if (!manifest) {
    throw new Error(`Missing package.json for packages/${dir}`);
  }
  return manifest;
}

describe("packageDirsRequiringChangeset", () => {
  it("collects published package manifests and source", () => {
    expect(
      packageDirsRequiringChangeset([
        "packages/core/package.json",
        "packages/aws/src/registry.ts",
        "packages/aws/vite.config.ts",
        "packages/core/tsconfig.json",
        "pnpm-lock.yaml",
        "package.json",
        "apps/playground/package.json",
      ]),
    ).toEqual(["aws", "core"]);
  });

  it("ignores tests, docs, workflows, and root config", () => {
    expect(
      packageDirsRequiringChangeset([
        "packages/core/src/index.test.ts",
        "packages/core/src/index.test.tsx",
        "packages/core/README.md",
        "README.md",
        ".github/workflows/ci.yml",
        "scripts/dependabot-changeset.mjs",
        "biome.json",
      ]),
    ).toEqual([]);
  });

  it("does not invent a package for shared artifact scripts", () => {
    expect(
      packageDirsRequiringChangeset(["scripts/validate-catalog.mjs"]),
    ).toEqual([]);
  });
});

describe("classifyChangedPackages", () => {
  it("skips private packages and sorts published names", () => {
    expect(
      classifyChangedPackages(
        [
          "packages/design/package.json",
          "packages/core/package.json",
          "packages/aws/src/index.ts",
        ],
        readManifest,
      ),
    ).toEqual({
      published: ["@archlex/aws", "@archlex/core"],
      skippedPrivate: ["@archlex/design"],
    });
  });

  it("returns no published packages when only private packages changed", () => {
    expect(
      classifyChangedPackages(["packages/design/package.json"], readManifest),
    ).toEqual({
      published: [],
      skippedPrivate: ["@archlex/design"],
    });
  });

  it("rejects unsafe package directories", () => {
    expect(() =>
      classifyChangedPackages(["packages/../package.json"], readManifest),
    ).toThrow('Refusing package directory ".."');
  });
});

describe("planDependabotChangeset", () => {
  it("does nothing when no published package changed", () => {
    const plan = planDependabotChangeset({
      changedPaths: [
        "pnpm-lock.yaml",
        "package.json",
        "packages/design/package.json",
      ],
      prNumber: 12,
      readManifest,
    });

    expect(plan.action).toBe("skip");
    expect(plan.reason).toBe("no published packages require a changeset");
    expect(plan.skippedPrivate).toEqual(["@archlex/design"]);
  });

  it("writes one patch changeset for each published package", () => {
    const plan = planDependabotChangeset({
      changedPaths: ["packages/core/package.json", "packages/aws/package.json"],
      prNumber: "42",
      readManifest,
    });

    expect(plan).toMatchObject({
      action: "write",
      path: ".changeset/dependabot-pr-42.md",
      reason: "add Dependabot changeset",
      packageNames: ["@archlex/aws", "@archlex/core"],
      remove: [],
    });
    expect(plan.contents).toBe(
      renderChangeset(["@archlex/aws", "@archlex/core"]),
    );
    expect(plan.contents).toContain(DEPENDABOT_CHANGESET_SUMMARY);
  });

  it("skips when the existing Dependabot changeset lists the same packages", () => {
    const path = ".changeset/dependabot-pr-42.md";
    const plan = planDependabotChangeset({
      changedPaths: ["packages/core/package.json", path],
      prNumber: 42,
      readManifest,
      readExisting: () =>
        `---\n"@archlex/core": patch\n---\n\nEdited summary kept.\n`,
    });

    expect(plan.action).toBe("skip");
    expect(plan.reason).toBe("Dependabot changeset already up to date");
    expect(plan.path).toBe(path);
  });

  it("updates the existing Dependabot changeset in place", () => {
    const path = ".changeset/dependabot-old.md";
    const plan = planDependabotChangeset({
      changedPaths: [
        "packages/core/package.json",
        "packages/aws/package.json",
        path,
      ],
      prNumber: 7,
      readManifest,
      readExisting: () => renderChangeset(["@archlex/core"]),
    });

    expect(plan.action).toBe("write");
    expect(plan.path).toBe(path);
    expect(plan.reason).toBe("update Dependabot changeset");
    expect(plan.remove).toEqual([]);
    expect(plan.contents).toBe(
      renderChangeset(["@archlex/aws", "@archlex/core"]),
    );
  });

  it("keeps the PR changeset and deletes duplicates when packages change", () => {
    const preferred = ".changeset/dependabot-pr-7.md";
    const extra = ".changeset/dependabot-extra.md";
    const plan = planDependabotChangeset({
      changedPaths: [
        "packages/aws/package.json",
        "packages/core/package.json",
        extra,
        preferred,
      ],
      prNumber: 7,
      readManifest,
      readExisting: (file) =>
        file === preferred
          ? renderChangeset(["@archlex/core"])
          : renderChangeset(["@archlex/aws"]),
    });

    expect(plan.path).toBe(preferred);
    expect(plan.reason).toBe("update Dependabot changeset");
    expect(plan.remove).toEqual([extra]);
    expect(plan.contents).toBe(
      renderChangeset(["@archlex/aws", "@archlex/core"]),
    );
  });

  it("refreshes a file in place when the preferred name already exists", () => {
    const path = ".changeset/dependabot-pr-7.md";
    const plan = planDependabotChangeset({
      changedPaths: [
        "packages/core/package.json",
        "packages/aws/package.json",
        path,
      ],
      prNumber: 7,
      readManifest,
      readExisting: () => renderChangeset(["@archlex/core"]),
    });

    expect(plan.path).toBe(path);
    expect(plan.reason).toBe("update Dependabot changeset");
    expect(plan.remove).toEqual([]);
  });

  it("drops a stale Dependabot changeset when published packages no longer changed", () => {
    const plan = planDependabotChangeset({
      changedPaths: ["pnpm-lock.yaml", ".changeset/dependabot-pr-7.md"],
      prNumber: 7,
      readManifest,
    });

    expect(plan.action).toBe("write");
    expect(plan.contents).toBeNull();
    expect(plan.remove).toEqual([".changeset/dependabot-pr-7.md"]);
  });

  it("uses a stable hash filename when the PR number is absent", () => {
    const first = newDependabotChangesetPath(null, ["@archlex/core"]);
    const second = newDependabotChangesetPath(null, ["@archlex/core"]);
    expect(first).toBe(second);
    expect(first).toMatch(/^\.changeset\/dependabot-[a-f0-9]{12}\.md$/);
  });
});

describe("applyDependabotChangeset", () => {
  it("writes the changeset and a second plan is a no-op", () => {
    const root = mkdtempSync(join(tmpdir(), "dependabot-changeset-"));
    try {
      const changed = ["packages/core/package.json"];
      const created = planDependabotChangeset({
        changedPaths: changed,
        prNumber: 9,
        readManifest,
      });
      applyDependabotChangeset(root, created);

      const file = join(root, ".changeset/dependabot-pr-9.md");
      expect(readFileSync(file, "utf8")).toBe(
        `---\n"@archlex/core": patch\n---\n\n${DEPENDABOT_CHANGESET_SUMMARY}\n`,
      );

      const again = planDependabotChangeset({
        changedPaths: [...changed, ".changeset/dependabot-pr-9.md"],
        prNumber: 9,
        readManifest,
        readExisting: (path) => readFileSync(join(root, path), "utf8"),
      });
      expect(again.action).toBe("skip");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("removes duplicate Dependabot changesets from disk", () => {
    const root = mkdtempSync(join(tmpdir(), "dependabot-changeset-"));
    try {
      const changesetDir = join(root, ".changeset");
      mkdirSync(changesetDir, { recursive: true });
      writeFileSync(
        join(changesetDir, "dependabot-pr-9.md"),
        renderChangeset(["@archlex/core"]),
      );
      writeFileSync(
        join(changesetDir, "dependabot-extra.md"),
        renderChangeset(["@archlex/core"]),
      );

      const plan = planDependabotChangeset({
        changedPaths: [
          "packages/core/package.json",
          ".changeset/dependabot-extra.md",
          ".changeset/dependabot-pr-9.md",
        ],
        prNumber: 9,
        readManifest,
        readExisting: (path) => readFileSync(join(root, path), "utf8"),
      });
      expect(plan.reason).toBe("remove duplicate Dependabot changesets");
      applyDependabotChangeset(root, plan);
      expect(existsSync(join(changesetDir, "dependabot-extra.md"))).toBe(false);
      expect(
        readFileSync(join(changesetDir, "dependabot-pr-9.md"), "utf8"),
      ).toContain("@archlex/core");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
