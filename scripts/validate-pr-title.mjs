#!/usr/bin/env node

const SUPPORTED_TYPES = new Set([
  "feat",
  "fix",
  "docs",
  "test",
  "refactor",
  "perf",
  "build",
  "ci",
  "chore",
  "revert",
]);

/**
 * Validates a pull request title against Conventional Commits format.
 * @param {string} title - The PR title to validate
 * @returns {{ valid: true } | { valid: false; reason: string }}
 */
export function validatePrTitle(title) {
  if (!title || title.trim() === "") {
    return { valid: false, reason: "PR title cannot be empty" };
  }

  // Pattern: type(scope)?: description
  // Breaking changes: type(scope)!: description
  const conventionalCommitRegex = /^([a-z]+)(\([a-z0-9-]+\))?(!)?:\s+(.+)$/;

  const match = title.match(conventionalCommitRegex);

  if (!match) {
    if (!/^[a-z]+/.test(title)) {
      return {
        valid: false,
        reason: "PR title must start with a lowercase type",
      };
    }
    if (!title.includes(":")) {
      return {
        valid: false,
        reason: "PR title must include a colon after the type",
      };
    }
    return {
      valid: false,
      reason:
        "PR title must follow Conventional Commits format: type(scope): description",
    };
  }

  const [, type, , , description] = match;

  if (!SUPPORTED_TYPES.has(type)) {
    return {
      valid: false,
      reason: `Type "${type}" is not supported. Supported types: ${Array.from(SUPPORTED_TYPES).join(", ")}`,
    };
  }

  if (!description || description.trim() === "") {
    return {
      valid: false,
      reason: "PR title must include a description after the colon",
    };
  }

  if (description.endsWith(".")) {
    return {
      valid: false,
      reason: "PR title description must not end with a period",
    };
  }

  return { valid: true };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const title = process.argv[2] || process.env.PR_TITLE || "";

  const result = validatePrTitle(title);

  if (result.valid) {
    console.log("✓ PR title is valid");
    process.exit(0);
  }

  console.error(`✗ Invalid PR title: ${result.reason}`);
  console.error(`  Title: "${title}"`);
  process.exit(1);
}
