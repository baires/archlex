import { describe, expect, it } from "vitest";
import { requiresChangeset } from "../scripts/require-changeset.mjs";

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
});
