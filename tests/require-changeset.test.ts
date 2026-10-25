import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isReleasePullRequest,
  loadPrivatePackageDirs,
  publishedManifestChanged,
  requiresChangeset,
  requiresChangesetForManifestDiff,
  requiresChangesetForRepo,
  runtimeDependenciesChanged,
} from "../scripts/require-changeset.mjs";

describe("requiresChangeset", () => {
  describe("requires changeset", () => {
    it("requires changeset for package source changes", () => {
      const result = requiresChangeset(["packages/core/src/index.ts"]);
      expect(result).toBe(true);
    });

    it("requires changeset for provider source changes", () => {
      const result = requiresChangeset(["packages/aws/src/registry.ts"]);
      expect(result).toBe(true);
    });

    it("requires changeset for package.json changes", () => {
      const result = requiresChangeset(["packages/core/package.json"]);
      expect(result).toBe(true);
    });

    it("requires changeset for vite config changes", () => {
      const result = requiresChangeset(["packages/core/vite.config.ts"]);
      expect(result).toBe(true);
    });

    it("requires changeset for tsconfig changes", () => {
      const result = requiresChangeset(["packages/core/tsconfig.json"]);
      expect(result).toBe(true);
    });

    it("requires changeset for shared artifact scripts", () => {
      const result = requiresChangeset(["scripts/validate-catalog.mjs"]);
      expect(result).toBe(true);
    });

    it("requires changeset for multiple package changes", () => {
      const result = requiresChangeset([
        "packages/core/src/index.ts",
        "packages/aws/src/icons.ts",
      ]);
      expect(result).toBe(true);
    });
  });

  describe("does not require changeset", () => {
    it("does not require changeset for app changes", () => {
      const result = requiresChangeset(["apps/playground/src/App.tsx"]);
      expect(result).toBe(false);
    });

    it("does not require changeset for markdown-only changes", () => {
      const result = requiresChangeset([
        "README.md",
        "docs/guide.md",
        "packages/core/README.md",
      ]);
      expect(result).toBe(false);
    });

    it("does not require changeset for test files", () => {
      const result = requiresChangeset([
        "packages/core/src/index.test.ts",
        "tests/integration.test.ts",
      ]);
      expect(result).toBe(false);
    });

    it("does not require changeset for GitHub workflows", () => {
      const result = requiresChangeset([
        ".github/workflows/ci.yml",
        ".github/workflows/release.yml",
      ]);
      expect(result).toBe(false);
    });

    it("does not require changeset for CI scripts", () => {
      const result = requiresChangeset(["scripts/validate-pr-title.mjs"]);
      expect(result).toBe(false);
    });

    it("does not require changeset for docs site", () => {
      const result = requiresChangeset(["apps/docs/src/pages/index.tsx"]);
      expect(result).toBe(false);
    });

    it("does not require changeset for landing site", () => {
      const result = requiresChangeset(["apps/landing/src/pages/index.astro"]);
      expect(result).toBe(false);
    });

    it("does not require changeset for config files", () => {
      const result = requiresChangeset([
        "biome.json",
        "turbo.json",
        "pnpm-workspace.yaml",
      ]);
      expect(result).toBe(false);
    });
  });

  describe("mixed changes", () => {
    it("requires changeset if any file needs it", () => {
      const result = requiresChangeset([
        "README.md",
        "packages/core/src/index.ts",
        "apps/playground/src/App.tsx",
      ]);
      expect(result).toBe(true);
    });

    it("does not require if all files are exempt", () => {
      const result = requiresChangeset([
        "README.md",
        "apps/playground/src/App.tsx",
        ".github/workflows/ci.yml",
      ]);
      expect(result).toBe(false);
    });
  });

  describe("private packages", () => {
    it("still flags private package paths unless those directories are provided", () => {
      expect(requiresChangeset(["packages/design/package.json"])).toBe(true);
    });

    it("skips private package directories when configured", () => {
      const privatePackageDirs = new Set(["design", "icons-node"]);
      expect(
        requiresChangeset(["packages/design/package.json"], {
          privatePackageDirs,
        }),
      ).toBe(false);
      expect(
        requiresChangeset(
          ["packages/design/src/index.ts", "packages/core/package.json"],
          { privatePackageDirs },
        ),
      ).toBe(true);
    });

    it("loads private package directories from a workspace", () => {
      const root = mkdtempSync(join(tmpdir(), "private-packages-"));
      try {
        const packages = join(root, "packages");
        mkdirSync(join(packages, "design"), { recursive: true });
        mkdirSync(join(packages, "core"), { recursive: true });
        writeFileSync(
          join(packages, "design", "package.json"),
          JSON.stringify({ name: "@archlex/design", private: true }),
        );
        writeFileSync(
          join(packages, "core", "package.json"),
          JSON.stringify({ name: "@archlex/core" }),
        );

        const dirs = loadPrivatePackageDirs(root);
        expect([...dirs]).toEqual(["design"]);
        expect(
          requiresChangesetForRepo(["packages/design/package.json"], root),
        ).toBe(false);
        expect(
          requiresChangesetForRepo(["packages/core/package.json"], root),
        ).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("uses BASE_SHA when stdin is not a TTY", () => {
      const root = mkdtempSync(join(tmpdir(), "require-changeset-cli-"));
      const script = join(process.cwd(), "scripts/require-changeset.mjs");
      const run = (args: { base: string; head: string; input?: string }) =>
        execFileSync("node", [script], {
          cwd: root,
          encoding: "utf8",
          input: args.input,
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            BASE_SHA: args.base,
            HEAD_SHA: args.head,
            PR_LABELS: "",
          },
        });
      const git = (args: string[]) =>
        execFileSync("git", args, {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });

      try {
        git(["init"]);
        git(["config", "user.email", "test@example.com"]);
        git(["config", "user.name", "Test"]);
        mkdirSync(join(root, "packages/core"), { recursive: true });
        mkdirSync(join(root, "packages/design"), { recursive: true });
        mkdirSync(join(root, ".changeset"), { recursive: true });
        writeFileSync(
          join(root, "packages/core/package.json"),
          '{"name":"@archlex/core"}\n',
        );
        writeFileSync(
          join(root, "packages/design/package.json"),
          '{"name":"@archlex/design","private":true}\n',
        );
        git(["add", "."]);
        git(["commit", "-m", "base"]);
        const base = git(["rev-parse", "HEAD"]).trim();

        writeFileSync(
          join(root, "packages/core/package.json"),
          '{"name":"@archlex/core","version":"1.0.0"}\n',
        );
        git(["add", "."]);
        git(["commit", "-m", "change"]);
        const head = git(["rev-parse", "HEAD"]).trim();

        expect(() => run({ base, head })).toThrow(/Changeset required/);

        const original = git(["branch", "--show-current"]).trim();
        git(["checkout", "-b", "private-only", base]);
        writeFileSync(
          join(root, "packages/design/package.json"),
          '{"name":"@archlex/design","private":true,"version":"1.0.0"}\n',
        );
        git(["add", "."]);
        git(["commit", "-m", "private"]);
        const privateHead = git(["rev-parse", "HEAD"]).trim();
        expect(run({ base, head: privateHead })).toContain(
          "No changeset required",
        );
        git(["checkout", original]);

        writeFileSync(
          join(root, ".changeset/demo.md"),
          '---\n"@archlex/core": patch\n---\n\nTest.\n',
        );
        git(["add", ".changeset/demo.md"]);
        git(["commit", "-m", "changeset"]);
        const withChangeset = git(["rev-parse", "HEAD"]).trim();
        expect(run({ base, head: withChangeset })).toContain(
          "Found 1 changeset",
        );

        git(["checkout", "-b", "devdeps-only", base]);
        writeFileSync(
          join(root, "packages/core/package.json"),
          '{"name":"@archlex/core","devDependencies":{"vite":"^8.3.4"}}\n',
        );
        git(["add", "."]);
        git(["commit", "-m", "devdeps"]);
        const devHead = git(["rev-parse", "HEAD"]).trim();
        expect(run({ base, head: devHead })).toContain("No changeset required");
        git(["checkout", original]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("still reads piped paths when BASE_SHA is unset", () => {
      const script = join(process.cwd(), "scripts/require-changeset.mjs");
      const env = {
        ...process.env,
        BASE_SHA: "",
        HEAD_SHA: "",
        PR_LABELS: "",
      };

      const exempt = execFileSync("node", [script], {
        cwd: process.cwd(),
        encoding: "utf8",
        input: "README.md\n",
        stdio: ["pipe", "pipe", "pipe"],
        env,
      });
      expect(exempt).toContain("No changeset required");

      expect(() =>
        execFileSync("node", [script], {
          cwd: process.cwd(),
          encoding: "utf8",
          input: "packages/core/package.json\n",
          stdio: ["pipe", "pipe", "pipe"],
          env,
        }),
      ).toThrow(/Changeset required/);
    });

    it("exempts this repo's private packages from the CI check", () => {
      const dirs = loadPrivatePackageDirs();
      expect(dirs.has("design")).toBe(true);
      expect(dirs.has("icons-browser")).toBe(true);
      expect(dirs.has("icons-node")).toBe(true);
      expect(dirs.has("core")).toBe(false);
      expect(requiresChangesetForRepo(["packages/design/package.json"])).toBe(
        false,
      );
      expect(requiresChangesetForRepo(["packages/core/package.json"])).toBe(
        true,
      );
    });
  });
});

describe("published manifest diffs", () => {
  it("ignores devDependency-only edits and dependency key order", () => {
    const before = {
      name: "@archlex/core",
      dependencies: { b: "1", a: "2" },
      devDependencies: { vite: "^6.4.3" },
    };
    const after = {
      name: "@archlex/core",
      dependencies: { a: "2", b: "1" },
      devDependencies: { vite: "^8.3.4" },
    };
    expect(publishedManifestChanged(before, after)).toBe(false);
    expect(runtimeDependenciesChanged(before, after)).toBe(false);
    expect(
      requiresChangesetForManifestDiff(
        ["packages/core/package.json", "pnpm-lock.yaml", "package.json"],
        () => ({ before, after }),
      ),
    ).toBe(false);
  });

  it("still requires a changeset when dependencies or other fields change", () => {
    const before = { name: "@archlex/core", dependencies: { zod: "1.0.0" } };
    const after = { name: "@archlex/core", dependencies: { zod: "1.0.1" } };
    expect(publishedManifestChanged(before, after)).toBe(true);
    expect(runtimeDependenciesChanged(before, after)).toBe(true);
    expect(
      requiresChangesetForManifestDiff(["packages/core/package.json"], () => ({
        before,
        after,
      })),
    ).toBe(true);
    expect(
      requiresChangesetForManifestDiff(["packages/core/src/index.ts"], () => ({
        before,
        after,
      })),
    ).toBe(true);
    expect(publishedManifestChanged(before, undefined)).toBe(true);
  });
});

describe("isReleasePullRequest", () => {
  it("skips changesets release PRs opened by github-actions", () => {
    expect(
      isReleasePullRequest("github-actions[bot]", "chore: release packages"),
    ).toBe(true);
    expect(
      isReleasePullRequest("github-actions[bot]", "Version Packages"),
    ).toBe(true);
    expect(
      isReleasePullRequest(
        "github-actions[bot]",
        "chore: Version Packages (#12)",
      ),
    ).toBe(true);
  });

  it("does not skip other authors or titles", () => {
    expect(
      isReleasePullRequest("dependabot[bot]", "chore: release packages"),
    ).toBe(false);
    expect(
      isReleasePullRequest("github-actions[bot]", "chore: bump vite"),
    ).toBe(false);
    expect(isReleasePullRequest("octocat", "Version Packages")).toBe(false);
  });
});
