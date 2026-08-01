#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { Command } from "commander";
import { createErrorsCommand } from "./commands/errors.js";
import { createExamplesCommand } from "./commands/examples.js";
import { createRenderCommand } from "./commands/render.js";
import { createValidateCommand } from "./commands/validate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getVersion(): Promise<string> {
  try {
    const packageJsonPath = join(__dirname, "../package.json");
    const packageJson = await readFile(packageJsonPath, "utf-8");
    return JSON.parse(packageJson).version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main() {
  const version = await getVersion();

  const program = new Command();

  program
    .name("archlex")
    .description(
      chalk.cyan(
        "ArchLex CLI - Cloud architecture diagrams with semantic validation",
      ),
    )
    .version(version, "-v, --version", "Output the current version");

  // Add commands
  program.addCommand(createRenderCommand());
  program.addCommand(createValidateCommand());
  program.addCommand(createExamplesCommand());
  program.addCommand(createErrorsCommand());

  // Show help if no arguments
  if (process.argv.length === 2) {
    program.help();
  }

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(chalk.red("Unexpected error:"), error);
  process.exit(2);
});
