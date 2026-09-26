#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootFlag = process.argv.indexOf("--root");
const root =
  rootFlag >= 0 ? resolve(process.argv[rootFlag + 1] ?? "") : defaultRoot;
const skippedDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);
const tokenName = "SHARE_SERVICE_TOKEN";
const assignmentPattern =
  /\bSHARE_SERVICE_TOKEN\s*=(?!=)\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}\]]*)/g;
const quotedPropertyPattern =
  /["']SHARE_SERVICE_TOKEN["']\s*:\s*["'][^"']*["']/g;
const propertyValuePattern = /\bSHARE_SERVICE_TOKEN\s*:\s*["'][^"']*["']/g;
const originKeys = new Set(["SHARE_ORIGIN", "PLAYGROUND_ORIGIN"]);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        files.push(...(await walk(join(directory, entry.name))));
      }
    } else if (entry.isFile()) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

function trackedFiles() {
  try {
    return execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\0")
      .filter(Boolean)
      .map((file) => resolve(root, file));
  } catch {
    return [];
  }
}

function assignmentLines(content) {
  const lines = content.split(/\r?\n/);
  const findings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (
      assignmentPattern.test(line) ||
      quotedPropertyPattern.test(line) ||
      propertyValuePattern.test(line)
    ) {
      findings.push(index + 1);
    }
    assignmentPattern.lastIndex = 0;
    quotedPropertyPattern.lastIndex = 0;
    propertyValuePattern.lastIndex = 0;
  }
  return findings;
}

const errors = [];
const files = await walk(root);
const devVarFiles = files.filter(
  (file) => file.split(/[\\/]/).at(-1) === ".dev.vars",
);
for (const file of devVarFiles) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("#")) continue;
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!assignment || !originKeys.has(assignment[1])) {
      errors.push(
        `${relative(root, file)}:${index + 1} (only origin settings are allowed)`,
      );
    }
    if (line.includes(tokenName)) {
      errors.push(
        `${relative(root, file)}:${index + 1} (service token is not allowed in .dev.vars)`,
      );
    }
  }
}

for (const file of trackedFiles()) {
  let content;
  try {
    content = await readFile(file, "utf8");
  } catch {
    continue;
  }
  if (
    file.split(/[\\/]/).at(-1) === "wrangler.json" &&
    content.includes(tokenName)
  ) {
    const line = content
      .slice(0, content.indexOf(tokenName))
      .split(/\r?\n/).length;
    errors.push(
      `${relative(root, file)}:${line} (service token must use Wrangler secrets)`,
    );
  }
  for (const line of assignmentLines(content)) {
    errors.push(
      `${relative(root, file)}:${line} (service token values cannot be tracked)`,
    );
  }
}

if (errors.length > 0) {
  process.stderr.write(
    `Share secret check failed:\n${errors.map((error) => `- ${error}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Share secret check passed (${trackedFiles().length} tracked files, ${devVarFiles.length} .dev.vars files).\n`,
  );
}
