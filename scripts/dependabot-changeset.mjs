#!/usr/bin/env node

/**
 * Adds one patch changeset for published packages whose runtime dependencies
 * a Dependabot PR changed.
 *
 * Only `dependencies` and `peerDependencies` count, in package manifests under
 * `packages/` or at the repo root. Dev-dependency bumps (Vite, Biome,
 * TypeScript, Vitest) do not get a changeset. The script writes
 * `.changeset/dependabot-pr-<number>.md` (or refreshes the Dependabot changeset
 * already on the branch) and, when `PR_HEAD_REF` is set, commits and pushes it.
 * Private packages are omitted. When no published package needs a release, the
 * script exits 0 without writing a file.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { runtimeDependenciesChanged } from "./require-changeset.mjs";

export const DEPENDABOT_CHANGESET_SUMMARY = "Bump dependencies (Dependabot).";

const PACKAGE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DEPENDABOT_CHANGESET_FILE =
  /^\.changeset\/dependabot-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
const COMMIT_SHA = /^(HEAD|[0-9a-f]{7,64})$/i;

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
 * @param {string[]} names
 * @returns {string[]}
 */
function sortedUnique(names) {
  return [...new Set(names)].sort(compareStrings);
}

/**
 * Package directory for a manifest path. Root `package.json` is `"."`.
 * @param {string} path
 * @returns {string | null}
 */
export function packageDirFromManifestPath(path) {
  if (path === "package.json") return ".";
  const match = /^packages\/([^/]+)\/package\.json$/.exec(path);
  return match ? match[1] : null;
}

/**
 * @param {string} packageDir
 */
function assertPackageDir(packageDir) {
  if (packageDir === ".") return;
  if (!PACKAGE_DIR_NAME.test(packageDir)) {
    throw new Error(`Refusing package directory "${packageDir}"`);
  }
}

/**
 * @param {string} packageDir
 * @returns {string}
 */
function manifestLabel(packageDir) {
  return packageDir === "."
    ? "package.json"
    : `packages/${packageDir}/package.json`;
}

/**
 * @param {unknown} name
 * @param {string} packageDir
 * @returns {string}
 */
function releaseName(name, packageDir) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error(`${manifestLabel(packageDir)} is missing a name`);
  }
  if (/["\r\n]/.test(name)) {
    throw new Error(`Package name cannot be written to a changeset: ${name}`);
  }
  return name;
}

/**
 * Published package names whose dependencies or peerDependencies changed.
 * Dev-dependency edits, source edits, and lockfile edits are ignored.
 * @param {string[]} changedPaths
 * @param {(dir: string) => Record<string, unknown> | null | undefined} readManifest
 * @param {(dir: string) => Record<string, unknown> | null | undefined} [readBaseManifest]
 * @returns {{ published: string[], skippedPrivate: string[] }}
 */
export function classifyChangedPackages(
  changedPaths,
  readManifest,
  readBaseManifest,
) {
  const published = [];
  const skippedPrivate = [];

  for (const path of changedPaths) {
    const dir = packageDirFromManifestPath(path);
    if (!dir) continue;
    assertPackageDir(dir);

    const head = readManifest(dir);
    if (head == null) continue;
    if (typeof head !== "object" || Array.isArray(head)) {
      throw new Error(`Invalid package.json for ${manifestLabel(dir)}`);
    }

    const base = readBaseManifest ? readBaseManifest(dir) : head;
    if (base != null && (typeof base !== "object" || Array.isArray(base))) {
      throw new Error(`Invalid package.json for ${manifestLabel(dir)}`);
    }
    if (!runtimeDependenciesChanged(base, head)) continue;

    if (head.private === true) {
      skippedPrivate.push(
        typeof head.name === "string" && head.name.length > 0 ? head.name : dir,
      );
      continue;
    }
    published.push(releaseName(head.name, dir));
  }

  return {
    published: sortedUnique(published),
    skippedPrivate: sortedUnique(skippedPrivate),
  };
}

/**
 * @param {string[]} packageNames
 * @param {string} [summary]
 * @returns {string}
 */
export function renderChangeset(
  packageNames,
  summary = DEPENDABOT_CHANGESET_SUMMARY,
) {
  if (packageNames.length === 0) {
    throw new Error("Cannot write an empty changeset");
  }
  const lines = packageNames.map((name) => `"${name}": patch`);
  return `---\n${lines.join("\n")}\n---\n\n${summary}\n`;
}

/**
 * Package names declared in a changeset, or null when the file is not a
 * simple patch/minor/major map.
 * @param {string} contents
 * @returns {string[] | null}
 */
export function parseChangesetPackageNames(contents) {
  const normalized = contents.replaceAll("\r\n", "\n");
  const match = /^---\n([\s\S]*?)\n---/.exec(normalized);
  if (!match) return null;
  const names = [];
  for (const line of match[1].split("\n")) {
    if (line.trim() === "") continue;
    const parsed = /^"([^"]+)":\s*(patch|minor|major)\s*$/.exec(line.trim());
    if (!parsed) return null;
    names.push(parsed[1]);
  }
  return names;
}

/**
 * @param {string[]} left
 * @param {string[]} right
 * @returns {boolean}
 */
function samePackageSet(left, right) {
  const a = sortedUnique(left);
  const b = sortedUnique(right);
  return a.length === b.length && a.every((name, index) => name === b[index]);
}

/**
 * @param {string[]} changedPaths
 * @returns {string[]}
 */
export function existingDependabotChangesets(changedPaths) {
  return changedPaths.filter((path) => DEPENDABOT_CHANGESET_FILE.test(path));
}

/**
 * @param {string | null | undefined} prNumber
 * @param {string[]} packageNames
 * @returns {string}
 */
export function newDependabotChangesetPath(prNumber, packageNames) {
  if (prNumber) return `.changeset/dependabot-pr-${prNumber}.md`;
  const hash = createHash("sha256")
    .update(sortedUnique(packageNames).join("\n"))
    .digest("hex")
    .slice(0, 12);
  return `.changeset/dependabot-${hash}.md`;
}

/**
 * @param {string} filePath
 */
function assertChangesetPath(filePath) {
  if (!DEPENDABOT_CHANGESET_FILE.test(filePath)) {
    throw new Error(`Refusing to write unexpected changeset path: ${filePath}`);
  }
}

/**
 * @param {{
 *   changedPaths: string[],
 *   readManifest: (dir: string) => { name?: unknown, private?: unknown } | null | undefined,
 *   readBaseManifest?: (dir: string) => { name?: unknown, private?: unknown } | null | undefined,
 *   readExisting?: (filePath: string) => string,
 *   prNumber?: string | number | null,
 * }} input
 * @returns {{
 *   action: "skip" | "write",
 *   path: string | null,
 *   contents: string | null,
 *   remove: string[],
 *   packageNames: string[],
 *   skippedPrivate: string[],
 *   reason: string,
 * }}
 */
export function planDependabotChangeset(input) {
  const prNumber = normalizePrNumber(input.prNumber);
  const { published, skippedPrivate } = classifyChangedPackages(
    input.changedPaths,
    input.readManifest,
    input.readBaseManifest,
  );
  const existing = existingDependabotChangesets(input.changedPaths).sort(
    compareStrings,
  );

  if (published.length === 0) {
    if (existing.length === 0) {
      return {
        action: "skip",
        path: null,
        contents: null,
        remove: [],
        packageNames: [],
        skippedPrivate,
        reason: "no published packages require a changeset",
      };
    }
    return {
      action: "write",
      path: null,
      contents: null,
      remove: existing,
      packageNames: [],
      skippedPrivate,
      reason: "remove Dependabot changeset; no runtime dependency changes",
    };
  }

  const contents = renderChangeset(published);
  const preferred = prNumber ? `.changeset/dependabot-pr-${prNumber}.md` : null;
  const target =
    preferred && existing.includes(preferred)
      ? preferred
      : (existing[0] ?? newDependabotChangesetPath(prNumber, published));
  const extras = existing.filter((file) => file !== target);
  const currentNames = existing.includes(target)
    ? parseChangesetPackageNames(input.readExisting?.(target) ?? "")
    : null;

  if (currentNames && samePackageSet(currentNames, published)) {
    if (extras.length === 0) {
      return {
        action: "skip",
        path: target,
        contents: null,
        remove: [],
        packageNames: published,
        skippedPrivate,
        reason: "Dependabot changeset already up to date",
      };
    }
    return {
      action: "write",
      path: target,
      contents: null,
      remove: extras,
      packageNames: published,
      skippedPrivate,
      reason: "remove duplicate Dependabot changesets",
    };
  }

  return {
    action: "write",
    path: target,
    contents,
    remove: extras,
    packageNames: published,
    skippedPrivate,
    reason: existing.includes(target)
      ? "update Dependabot changeset"
      : "add Dependabot changeset",
  };
}

/**
 * @param {string | number | null | undefined} prNumber
 * @returns {string | null}
 */
function normalizePrNumber(prNumber) {
  if (prNumber == null || prNumber === "") return null;
  const value = String(prNumber);
  if (!/^[0-9]+$/.test(value)) {
    throw new Error("PR_NUMBER must be numeric");
  }
  return value;
}

/**
 * @param {string} root
 * @param {{ action: "skip" | "write", path: string | null, contents: string | null, remove: string[] }} plan
 * @returns {string[]} repo-relative paths to stage
 */
export function applyDependabotChangeset(root, plan) {
  if (plan.action === "skip") return [];
  const touched = [];

  if (plan.path && typeof plan.contents === "string") {
    assertChangesetPath(plan.path);
    const absolute = join(root, plan.path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, plan.contents);
    touched.push(plan.path);
  }

  for (const file of plan.remove) {
    assertChangesetPath(file);
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    rmSync(absolute);
    touched.push(file);
  }

  return touched;
}

/**
 * @param {string[]} args
 * @param {{ capture?: boolean, env?: NodeJS.ProcessEnv }} [options]
 * @returns {string}
 */
function git(args, options = {}) {
  const capture = options.capture ?? false;
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      env: options.env ?? process.env,
      stdio: capture
        ? ["ignore", "pipe", "pipe"]
        : ["ignore", "inherit", "inherit"],
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error && error.stderr
        ? String(error.stderr)
        : "";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `git ${args.join(" ")} failed\n${stderr || message}`.trim(),
    );
  }
}

/**
 * @param {string} value
 * @param {string} label
 */
function assertCommitSha(value, label) {
  if (!COMMIT_SHA.test(value)) {
    throw new Error(`${label} must be a commit SHA`);
  }
}

/**
 * @param {string} branch
 */
function assertBranch(branch) {
  if (
    !/^[A-Za-z0-9._/-]+$/.test(branch) ||
    branch.includes("..") ||
    branch.startsWith("-") ||
    branch.startsWith("/") ||
    branch.endsWith("/")
  ) {
    throw new Error("PR_HEAD_REF is not a safe branch name");
  }
}

/**
 * @param {string[]} paths
 * @param {string} branch
 */
function commitAndPush(paths, branch) {
  assertBranch(branch);
  if (paths.length === 0) {
    console.log("✓ No changeset files to commit");
    return;
  }

  git(["add", "--", ...paths]);
  const staged = git(["diff", "--cached", "--name-only", "--", ...paths], {
    capture: true,
  }).trim();
  if (!staged) {
    console.log("✓ Dependabot changeset already up to date");
    return;
  }

  git(
    [
      "-c",
      "user.name=github-actions[bot]",
      "-c",
      "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "chore: add Dependabot patch changeset",
    ],
    { env: { ...process.env, HUSKY: "0" } },
  );
  git(["push", "origin", `HEAD:${branch}`]);
  console.log(`✓ Pushed Dependabot changeset to ${branch}`);
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissingGitPath(error) {
  const stderr =
    error && typeof error === "object" && "stderr" in error && error.stderr
      ? String(error.stderr)
      : "";
  const message = error instanceof Error ? error.message : String(error);
  const combined = `${stderr}\n${message}`;
  return (
    combined.includes("does not exist in") ||
    combined.includes("exists on disk, but not in")
  );
}

/**
 * Manifest object at `rev`, or null when that file is absent.
 * @param {string} rev
 * @param {string} packageDir
 * @returns {Record<string, unknown> | null}
 */
function readGitManifest(rev, packageDir) {
  assertPackageDir(packageDir);
  assertCommitSha(rev, "revision");
  const rel = manifestLabel(packageDir);
  let text;
  try {
    text = git(["show", `${rev}:${rel}`], { capture: true });
  } catch (error) {
    if (isMissingGitPath(error)) return null;
    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON in ${rev}:${rel}`);
  }
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest)
  ) {
    throw new Error(`Invalid package.json for ${rel}`);
  }
  return manifest;
}

function main() {
  const base = process.env.BASE_SHA;
  if (!base) {
    console.error("✗ BASE_SHA environment variable is required");
    process.exit(1);
  }
  const head = process.env.HEAD_SHA || "HEAD";
  assertCommitSha(base, "BASE_SHA");
  assertCommitSha(head, "HEAD_SHA");

  const changedPaths = git(["diff", "--name-only", base, head], {
    capture: true,
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const plan = planDependabotChangeset({
    changedPaths,
    prNumber: process.env.PR_NUMBER,
    readManifest: (dir) => readGitManifest(head, dir),
    readBaseManifest: (dir) => readGitManifest(base, dir),
    readExisting: (file) => readFileSync(file, "utf8"),
  });

  console.log(plan.reason);
  if (plan.packageNames.length > 0) {
    console.log(`Packages: ${plan.packageNames.join(", ")}`);
  }
  if (plan.skippedPrivate.length > 0) {
    console.log(`Skipped private packages: ${plan.skippedPrivate.join(", ")}`);
  }
  if (plan.action === "skip") return;

  const touched = applyDependabotChangeset(process.cwd(), plan);
  const branch = process.env.PR_HEAD_REF;
  if (!branch) {
    if (process.env.GITHUB_ACTIONS === "true") {
      console.error("✗ PR_HEAD_REF is required to push the changeset");
      process.exit(1);
    }
    console.log(
      `Wrote ${touched.join(", ") || "nothing"} (PR_HEAD_REF unset, not pushing)`,
    );
    return;
  }

  commitAndPush(touched, branch);
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  try {
    main();
  } catch (error) {
    console.error(
      `✗ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
