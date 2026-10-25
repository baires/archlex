#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const RUNTIME_DEPENDENCY_FIELDS = ["dependencies", "peerDependencies"];

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * JSON with object keys sorted so key order is not a change.
 * @param {unknown} value
 * @returns {string}
 */
function stableJson(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort(compareStrings);
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

/**
 * @param {unknown} manifest
 * @param {string} field
 * @returns {unknown}
 */
function dependencySection(manifest, field) {
  if (
    manifest == null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest)
  ) {
    return {};
  }
  const value = manifest[field];
  if (value == null) return {};
  return value;
}

/**
 * True when `dependencies` or `peerDependencies` differ.
 * Missing manifests and missing fields compare as empty. Key order is ignored.
 * @param {unknown} before
 * @param {unknown} after
 * @returns {boolean}
 */
export function runtimeDependenciesChanged(before, after) {
  return RUNTIME_DEPENDENCY_FIELDS.some(
    (field) =>
      stableJson(dependencySection(before, field)) !==
      stableJson(dependencySection(after, field)),
  );
}

/**
 * @param {unknown} manifest
 * @returns {unknown}
 */
function omitDevDependencies(manifest) {
  if (
    manifest == null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest)
  ) {
    return manifest;
  }
  const rest = {};
  for (const key of Object.keys(manifest)) {
    if (key === "devDependencies") continue;
    rest[key] = manifest[key];
  }
  return rest;
}

/**
 * True when a package.json edit can affect a published package.
 * `devDependencies`-only edits do not. `undefined` means unparseable and
 * still requires a changeset. Null means the file is absent.
 * @param {unknown} before
 * @param {unknown} after
 * @returns {boolean}
 */
export function publishedManifestChanged(before, after) {
  if (before === undefined || after === undefined) return true;
  const left = omitDevDependencies(before);
  const right = omitDevDependencies(after);
  if (left == null && right == null) return false;
  if (left == null || right == null) return true;
  return stableJson(left) !== stableJson(right);
}

/**
 * Path rules, with package.json narrowed to published-manifest edits.
 * Dev-dependency-only manifest diffs do not require a changeset.
 * @param {string[]} changedPaths
 * @param {(path: string) => { before?: unknown, after?: unknown } | null | undefined} readPair
 * @param {{ privatePackageDirs?: ReadonlySet<string> }} [options]
 * @returns {boolean}
 */
export function requiresChangesetForManifestDiff(
  changedPaths,
  readPair,
  options = {},
) {
  const privatePackageDirs = options.privatePackageDirs ?? new Set();
  for (const path of changedPaths) {
    if (!requiresChangeset([path], { privatePackageDirs })) continue;
    if (!/^packages\/[^/]+\/package\.json$/.test(path)) return true;
    const pair = readPair(path);
    const before = pair ? pair.before : undefined;
    const after = pair ? pair.after : undefined;
    if (publishedManifestChanged(before, after)) return true;
  }
  return false;
}

/**
 * Changesets release PRs already carry the version bump. They must not be
 * blocked on another changeset file.
 * @param {string} login
 * @param {string} title
 * @returns {boolean}
 */
export function isReleasePullRequest(login, title) {
  if (login !== "github-actions[bot]") return false;
  if (typeof title !== "string") return false;
  return (
    title.includes("Version Packages") ||
    title.includes("chore: release packages")
  );
}

/**
 * @param {string} rev
 * @param {string} filePath
 * @returns {string | null}
 */
function gitShow(rev, filePath) {
  try {
    return execFileSync("git", ["show", `${rev}:${filePath}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error && error.stderr
        ? String(error.stderr)
        : "";
    const message = error instanceof Error ? error.message : String(error);
    const combined = `${stderr}\n${message}`;
    if (
      combined.includes("does not exist in") ||
      combined.includes("exists on disk, but not in")
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Parsed manifest at `rev`, null when missing, undefined when unparseable.
 * @param {string} rev
 * @param {string} filePath
 * @returns {unknown}
 */
function readManifestRevision(rev, filePath) {
  const text = gitShow(rev, filePath);
  if (text == null) return null;
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--release-pr-check")) {
    const skip = isReleasePullRequest(
      process.env.PR_LOGIN ?? "",
      process.env.PR_TITLE ?? "",
    );
    console.log(`is_version_pr=${skip ? "true" : "false"}`);
    process.exit(0);
  }

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

  const needsChangeset = baseSha
    ? requiresChangesetForManifestDiff(
        changedPaths,
        (path) => ({
          before: readManifestRevision(baseSha, path),
          after: readManifestRevision(headSha, path),
        }),
        { privatePackageDirs: loadPrivatePackageDirs() },
      )
    : requiresChangesetForRepo(changedPaths);

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
    "Reason: Changes are limited to devDependencies, apps, docs, tests, CI, markdown, or private packages",
  );
  process.exit(0);
}
