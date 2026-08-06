#!/usr/bin/env node

/**
 * Determines if a changeset is required based on changed file paths.
 * @param {string[]} changedPaths - Array of changed file paths
 * @returns {boolean} - True if a changeset is required
 */
export function requiresChangeset(changedPaths) {
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

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const { execSync } = await import("node:child_process");
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

  // Check if we're reading from stdin (for tests)
  if (!stdin.isTTY) {
    const { readFileSync } = await import("node:fs");
    const input = readFileSync(0, "utf-8");
    changedPaths = input.trim().split("\n").filter(Boolean);
  } else {
    // In CI: get changed files from git diff
    const baseSha = process.env.BASE_SHA;
    const headSha = process.env.HEAD_SHA || "HEAD";

    if (!baseSha) {
      console.error("✗ BASE_SHA environment variable is required");
      process.exit(1);
    }

    try {
      const output = execSync(
        `git diff --name-only "${baseSha}" "${headSha}"`,
        {
          encoding: "utf-8",
        },
      );
      changedPaths = output.trim().split("\n").filter(Boolean);
    } catch (error) {
      console.error("✗ Failed to get changed files:", error.message);
      process.exit(1);
    }
  }

  if (changedPaths.length === 0) {
    console.log("✓ No files changed");
    process.exit(0);
  }

  const needsChangeset = requiresChangeset(changedPaths);

  if (needsChangeset) {
    console.log("Changed files requiring a changeset:");
    for (const path of changedPaths) {
      console.log(`  - ${path}`);
    }
    console.log("");

    // Check if changeset exists
    const { readdirSync, existsSync } = await import("node:fs");
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
    "Reason: All changes are to exempt paths (apps, docs, tests, CI, markdown)",
  );
  process.exit(0);
}
