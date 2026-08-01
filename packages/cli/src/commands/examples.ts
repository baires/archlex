import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { Command } from "commander";
import { handleError } from "../utils/errors.js";
import { formatInfo, formatSuccess } from "../utils/formatters.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Example {
  id: string;
  name: string;
  description: string;
  content: string;
}

export function createExamplesCommand(): Command {
  const command = new Command("examples").description(
    "Work with example CloudMer diagrams",
  );

  command
    .command("list")
    .alias("ls")
    .description("List available example diagrams")
    .action(async () => {
      try {
        await listExamples();
      } catch (error) {
        handleError(error);
      }
    });

  command
    .command("get")
    .description("Get an example diagram by ID")
    .argument("<id>", "Example ID (e.g., aws-3-tier-web)")
    .action(async (id: string) => {
      try {
        await getExample(id);
      } catch (error) {
        handleError(error);
      }
    });

  return command;
}

async function listExamples(): Promise<void> {
  const examples = await loadExamples();

  console.log(chalk.bold("\nAvailable Examples:\n"));

  for (const example of examples) {
    console.log(chalk.cyan(`  ${example.id}`));
    console.log(chalk.dim(`  ${example.name}`));
    console.log(`  ${example.description}`);
    console.log();
  }

  console.log(
    formatInfo(
      `Use ${chalk.cyan("cloudmer examples get <id>")} to view an example`,
    ),
  );
  console.log();
}

async function getExample(id: string): Promise<void> {
  const examples = await loadExamples();
  const example = examples.find((ex) => ex.id === id);

  if (!example) {
    console.error(chalk.red(`Example "${id}" not found`));
    console.log();
    console.log(formatInfo("Available examples:"));
    for (const ex of examples) {
      console.log(chalk.dim(`  - ${ex.id}`));
    }
    console.log();
    process.exit(1);
  }

  console.log(example.content);
}

async function loadExamples(): Promise<Example[]> {
  // Examples are bundled in the CLI package at dist/examples
  const examplesDir = join(__dirname, "../examples");

  let files: string[];

  try {
    files = await readdir(examplesDir);
  } catch {
    // If examples directory doesn't exist (e.g., in development),
    // return empty array
    return [];
  }

  const examples: Example[] = [];

  for (const file of files) {
    if (!file.endsWith(".cloudmer")) continue;

    const filePath = join(examplesDir, file);
    const content = await readFile(filePath, "utf-8");

    // Extract metadata from comments at the top of the file
    const lines = content.split("\n");
    let name = "";
    let description = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) {
        const text = trimmed.slice(2).trim();
        if (!name) {
          name = text;
        } else if (!description) {
          description = text;
        } else {
          break;
        }
      } else if (trimmed && !trimmed.startsWith("//")) {
        // Stop at first non-comment line
        break;
      }
    }

    const id = basename(file, ".cloudmer");

    examples.push({
      id,
      name: name || id,
      description: description || "No description available",
      content,
    });
  }

  return examples.sort((a, b) => a.id.localeCompare(b.id));
}
