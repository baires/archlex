#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Determines if a changeset is required based on changed file paths.
 * Private workspace packages are exempt only when `privatePackageDirs` is
 * provided. Those packages are not published.
 * @param {string[]} changedPaths - Array of changed file paths
 * @param {{ privatePackageDirs?: ReadonlySet<string> }} [options]
 * @returns {boolean} - True if a changeset is required
 */
export function requiresChangeset(changedPaths, options = {}) {
  const privatePackageDirs = options.privatePackageDirs ?? new Set();
  // Patterns that require a changeset
  const requiresChangesetPatterns = [
    // Any source file in packages/ (except tests)
    /^packages\/[^/]+\/src\/(?!.*\.test\.ts$).*\.(ts|tsx|js|jsx|mjs)$/,
    // Package configuration files
    /^packages\/[^/]+\/(package\.json|vite\.config\.(ts|js|mjs)|tsconfig\.json)$/,
    // Shared artifact scripts that affect build output
    /^scripts\/(validate-catalog\.mjs|public-packages\.mjs)$/,
  ];

  // Patterns that explicitly do NOT require a changeset
  const exemptPatterns = [
    // Apps (playground, docs, landing)
    /^apps\//,
    // Markdown files anywhere
    /\.md$/,
    // Test files
    /\.test\.(ts|tsx|js|jsx)$/,
    /^tests\//,
    // GitHub workflows and CI config
    /^\.github\//,
    // CI scripts (not artifact-related)
    /^scripts\/(?!validate-catalog\.mjs|public-packages\.mjs)/,
    // Root config files
    /^(biome\.json|turbo\.json|pnpm-workspace\.yaml|\.gitignore|\.npmrc)$/,
    // Changeset files themselves
    /^\.changeset\//,
  ];

  for (const path of changedPaths) {
    const packageDir = /^packages\/([^/]+)\//.exec(path)?.[1];
    if (packageDir && privatePackageDirs.has(packageDir)) {
      continue;
    }

    // Check exempt patterns first
    const isExempt = exemptPatterns.some((pattern) => pattern.test(path));
    if (isExempt) {
      continue;
    }

    // Check if it requires a changeset
    const needsChangeset = requiresChangesetPatterns.some((pattern) =>
      pattern.test(path),
    );
    if (needsChangeset) {
      return true;
    }
  }

  return false;
}

/**
 * Package directories under `packages/` whose package.json sets `"private": true`.
 * @param {string} [root]
 * @returns {Set<string>}
 */
export function loadPrivatePackageDirs(root = process.cwd()) {
  const packagesDir = join(root, "packages");
  const dirs = new Set();
  if (!existsSync(packagesDir)) return dirs;

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !PACKAGE_DIR_NAME.test(entry.name)) continue;
    const manifestPath = join(packagesDir, entry.name, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest?.private === true) dirs.add(entry.name);
  }

  return dirs;
}

/**
 * Repo-aware changeset check used by CI. Private workspace packages are exempt.
 * @param {string[]} changedPaths
 * @param {string} [root]
 * @returns {boolean}
 */
export function requiresChangesetForRepo(changedPaths, root = process.cwd()) {
  return requiresChangeset(changedPaths, {
    privatePackageDirs: loadPrivatePackageDirs(root),
  });
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const { stdin } = await import("node:process");

  // Check for no-changeset-required label override
  const hasOverrideLabel = process.env.PR_LABELS?.includes(
    "no-changeset-required",
  );

  if (hasOverrideLabel) {
    console.log(
      "✓ Changeset check bypassed due to 'no-changeset-required' label",
    );
    process.exit(0);
  }

  let changedPaths = [];
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA || "HEAD";

  // GitHub Actions steps do not have a TTY, so `stdin.isTTY` is unset even
  // when the caller did not pipe a path list. That used to take the stdin
  // branch, read EOF, and report "No files changed". Use the git diff
  // whenever CI provides BASE_SHA. Stdin remains the local/test path.
  if (baseSha) {
    if (
      !/^(HEAD|[0-9a-f]{7,64})$/i.test(baseSha) ||
      !/^(HEAD|[0-9a-f]{7,64})$/i.test(headSha)
    ) {
      console.error("✗ BASE_SHA and HEAD_SHA must be commit SHAs");
      process.exit(1);
    }

    try {
      const output = execFileSync(
        "git",
        ["diff", "--name-only", baseSha, headSha],
        { encoding: "utf8" },
      );
      changedPaths = output.trim().split("\n").filter(Boolean);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("✗ Failed to get changed files:", message);
      process.exit(1);
    }
  } else if (!stdin.isTTY) {
    const input = readFileSync(0, "utf8");
    changedPaths = input.trim().split("\n").filter(Boolean);
  } else {
    console.error("✗ BASE_SHA environment variable is required");
    process.exit(1);
  }

  if (changedPaths.length === 0) {
    console.log("✓ No files changed");
    process.exit(0);
  }

  const needsChangeset = requiresChangesetForRepo(changedPaths);

  if (needsChangeset) {
    console.log("Changed files requiring a changeset:");
    for (const path of changedPaths) {
      console.log(`  - ${path}`);
    }
    console.log("");

    // Check if changeset exists
    const changesetDir = ".changeset";

    if (!existsSync(changesetDir)) {
      console.error("✗ No .changeset directory found");
      process.exit(1);
    }

    const changesetFiles = readdirSync(changesetDir).filter(
      (f) => f.endsWith(".md") && f !== "README.md",
    );

    if (changesetFiles.length === 0) {
      console.error(
        "✗ Changeset required but none found. Run 'pnpm changeset' to create one.",
      );
      process.exit(1);
    }

    console.log(`✓ Found ${changesetFiles.length} changeset(s)`);
    process.exit(0);
  }

  console.log("✓ No changeset required for these changes");
  console.log(
    "Reason: All changes are to exempt paths (apps, docs, tests, CI, markdown, private packages)",
  );
  process.exit(0);
}
