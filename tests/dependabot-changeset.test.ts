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
  applyDependabotChangeset,
  classifyChangedPackages,
  DEPENDABOT_CHANGESET_SUMMARY,
  newDependabotChangesetPath,
  packageDirFromManifestPath,
  planDependabotChangeset,
  renderChangeset,
} from "../scripts/dependabot-changeset.mjs";
import { runtimeDependenciesChanged } from "../scripts/require-changeset.mjs";

type Manifest = {
  name: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const headManifests: Record<string, Manifest> = {
  core: {
    name: "@archlex/core",
    dependencies: { zod: "^4.6.6" },
    devDependencies: { vite: "^8.3.4" },
  },
  aws: {
    name: "@archlex/aws",
    dependencies: { zod: "^4.6.6" },
    devDependencies: { vite: "^8.3.4" },
  },
  design: {
    name: "@archlex/design",
    private: true,
    dependencies: { zod: "^4.6.6" },
  },
  ".": {
    name: "arch-lex-monorepo",
    private: true,
    devDependencies: { vite: "^8.3.4" },
  },
};

const baseManifests: Record<string, Manifest> = {
  core: {
    name: "@archlex/core",
    dependencies: { zod: "^4.6.5" },
    devDependencies: { vite: "^6.4.3" },
  },
  aws: {
    name: "@archlex/aws",
    dependencies: { zod: "^4.6.5" },
    devDependencies: { vite: "^6.4.3" },
  },
  design: {
    name: "@archlex/design",
    private: true,
    dependencies: { zod: "^4.6.5" },
  },
  ".": {
    name: "arch-lex-monorepo",
    private: true,
    devDependencies: { vite: "^6.4.3" },
  },
};

function readManifest(dir: string) {
  const manifest = headManifests[dir];
  if (!manifest) {
    throw new Error(`Missing package.json for packages/${dir}`);
  }
  return manifest;
}

function readBaseManifest(dir: string) {
  return baseManifests[dir] ?? null;
}

function planChangeset(
  input: Parameters<typeof planDependabotChangeset>[0],
): ReturnType<typeof planDependabotChangeset> {
  return planDependabotChangeset({
    readManifest,
    readBaseManifest,
    ...input,
  });
}

describe("runtime dependency selection", () => {
  it("reads package manifests and the root manifest", () => {
    expect(packageDirFromManifestPath("packages/core/package.json")).toBe(
      "core",
    );
    expect(packageDirFromManifestPath("package.json")).toBe(".");
    expect(packageDirFromManifestPath("packages/aws/src/index.ts")).toBeNull();
    expect(packageDirFromManifestPath("pnpm-lock.yaml")).toBeNull();
  });

  it("ignores devDependencies and dependency key order", () => {
    expect(
      runtimeDependenciesChanged(
        {
          dependencies: { b: "1", a: "2" },
          devDependencies: { vite: "^6.4.3" },
        },
        {
          dependencies: { a: "2", b: "1" },
          devDependencies: { vite: "^8.3.4" },
        },
      ),
    ).toBe(false);
    expect(
      runtimeDependenciesChanged(
        { peerDependencies: { react: "^18" } },
        { peerDependencies: { react: "^19" } },
      ),
    ).toBe(true);
  });
});

describe("classifyChangedPackages", () => {
  it("skips private packages and sorts published names", () => {
    expect(
      classifyChangedPackages(
        [
          "packages/design/package.json",
          "packages/core/package.json",
          "packages/aws/package.json",
        ],
        readManifest,
        readBaseManifest,
      ),
    ).toEqual({
      published: ["@archlex/aws", "@archlex/core"],
      skippedPrivate: ["@archlex/design"],
    });
  });

  it("returns no published packages when only private packages changed", () => {
    expect(
      classifyChangedPackages(
        ["packages/design/package.json"],
        readManifest,
        readBaseManifest,
      ),
    ).toEqual({
      published: [],
      skippedPrivate: ["@archlex/design"],
    });
  });

  it("ignores devDependency-only, source, and lockfile edits", () => {
    const sameRuntime = {
      name: "@archlex/core",
      dependencies: { zod: "^4.6.5" },
      devDependencies: { vite: "^6.4.3" },
    };
    expect(
      classifyChangedPackages(
        [
          "packages/core/package.json",
          "packages/aws/src/index.ts",
          "packages/core/vite.config.ts",
          "pnpm-lock.yaml",
          "package.json",
        ],
        (dir) =>
          dir === "."
            ? headManifests["."]
            : { ...sameRuntime, devDependencies: { vite: "^8.3.4" } },
        (dir) => (dir === "." ? baseManifests["."] : sameRuntime),
      ),
    ).toEqual({ published: [], skippedPrivate: [] });
  });

  it("selects a package when only peerDependencies change", () => {
    expect(
      classifyChangedPackages(
        ["packages/core/package.json"],
        () => ({
          name: "@archlex/core",
          dependencies: { zod: "^4.6.5" },
          peerDependencies: { react: "^19" },
        }),
        () => ({
          name: "@archlex/core",
          dependencies: { zod: "^4.6.5" },
          peerDependencies: { react: "^18" },
        }),
      ),
    ).toEqual({ published: ["@archlex/core"], skippedPrivate: [] });
  });

  it("rejects unsafe package directories", () => {
    expect(() =>
      classifyChangedPackages(["packages/../package.json"], readManifest),
    ).toThrow('Refusing package directory ".."');
  });
});

describe("planDependabotChangeset", () => {
  it("does nothing when no published package changed", () => {
    const plan = planChangeset({
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
    const plan = planChangeset({
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
    const plan = planChangeset({
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
    const plan = planChangeset({
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
    const plan = planChangeset({
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
    const plan = planChangeset({
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
    const plan = planChangeset({
      changedPaths: ["pnpm-lock.yaml", ".changeset/dependabot-pr-7.md"],
      prNumber: 7,
      readManifest,
    });

    expect(plan.action).toBe("write");
    expect(plan.contents).toBeNull();
    expect(plan.remove).toEqual([".changeset/dependabot-pr-7.md"]);
    expect(plan.reason).toBe(
      "remove Dependabot changeset; no runtime dependency changes",
    );
  });

  it("drops a changeset when the bump only touches devDependencies", () => {
    const runtime = { dependencies: { zod: "^4.6.5" } };
    const planResult = planChangeset({
      changedPaths: [
        "package.json",
        "packages/core/package.json",
        "packages/aws/package.json",
        ".changeset/dependabot-pr-143.md",
      ],
      prNumber: 143,
      readManifest: (dir) => ({
        name: dir === "." ? "arch-lex-monorepo" : `@archlex/${dir}`,
        private: dir === ".",
        ...runtime,
        devDependencies: { vite: "^8.3.4" },
      }),
      readBaseManifest: (dir) => ({
        name: dir === "." ? "arch-lex-monorepo" : `@archlex/${dir}`,
        private: dir === ".",
        ...runtime,
        devDependencies: { vite: "^6.4.3" },
      }),
    });

    expect(planResult.action).toBe("write");
    expect(planResult.contents).toBeNull();
    expect(planResult.packageNames).toEqual([]);
    expect(planResult.remove).toEqual([".changeset/dependabot-pr-143.md"]);
  });

  it("includes a published root package when its dependencies change", () => {
    const planResult = planChangeset({
      changedPaths: ["package.json"],
      prNumber: 3,
      readManifest: () => ({
        name: "arch-lex-monorepo",
        dependencies: { zod: "^4.6.6" },
      }),
      readBaseManifest: () => ({
        name: "arch-lex-monorepo",
        dependencies: { zod: "^4.6.5" },
      }),
    });

    expect(planResult.packageNames).toEqual(["arch-lex-monorepo"]);
    expect(planResult.action).toBe("write");
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
      const created = planChangeset({
        changedPaths: changed,
        prNumber: 9,
        readManifest,
      });
      applyDependabotChangeset(root, created);

      const file = join(root, ".changeset/dependabot-pr-9.md");
      expect(readFileSync(file, "utf8")).toBe(
        `---\n"@archlex/core": patch\n---\n\n${DEPENDABOT_CHANGESET_SUMMARY}\n`,
      );

      const again = planChangeset({
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

      const plan = planChangeset({
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
