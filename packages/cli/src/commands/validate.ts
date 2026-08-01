import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { awsProvider, createArchLex, gcpProvider } from "@archlex/core";
import type { ValidationMode } from "@archlex/model";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import {
  FileNotFoundError,
  ParseError,
  ValidationError,
  handleError,
} from "../utils/errors.js";
import {
  formatDiagnostic,
  formatDiagnosticSummary,
  formatSuccess,
} from "../utils/formatters.js";

interface ValidateOptions {
  validation?: ValidationMode;
  stdin?: boolean;
}

export function createValidateCommand(): Command {
  return new Command("validate")
    .description("Validate a ArchLex diagram without rendering")
    .argument("[input]", "Input .archlex file (or use --stdin)")
    .option(
      "-v, --validation <mode>",
      "Validation mode (normal, strict, off)",
      "strict",
    )
    .option("--stdin", "Read input from stdin")
    .action(async (input: string | undefined, options: ValidateOptions) => {
      try {
        await validateCommand(input, options);
      } catch (error) {
        handleError(error);
      }
    });
}

async function validateCommand(
  input: string | undefined,
  options: ValidateOptions,
): Promise<void> {
  // Read input
  const spinner = ora("Reading input").start();

  let source: string;

  try {
    if (options.stdin) {
      // Read from stdin
      source = await readStdin();
      spinner.succeed("Read from stdin");
    } else if (input) {
      // Read from file
      const inputPath = resolve(input);
      source = await readFile(inputPath, "utf-8");
      spinner.succeed(`Read ${chalk.cyan(input)}`);
    } else {
      spinner.fail("No input provided");
      throw new Error("Either provide an input file or use --stdin");
    }
  } catch (error) {
    spinner.fail("Failed to read input");
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new FileNotFoundError(input || "");
    }
    throw error;
  }

  // Parse and validate
  spinner.start("Validating diagram");

  const archlex = createArchLex({
    providers: [awsProvider(), gcpProvider()],
  });

  let result: Awaited<ReturnType<typeof archlex.render>>;

  try {
    result = await archlex.render(source, {
      validation: options.validation || "strict",
    });
  } catch (error) {
    spinner.fail("Validation failed");
    throw new ParseError(
      error instanceof Error ? error.message : String(error),
    );
  }

  // Show diagnostics
  const { summary, hasErrors } = formatDiagnosticSummary(result.diagnostics);

  spinner.stop();

  if (result.diagnostics.length > 0) {
    console.log();
    for (const diagnostic of result.diagnostics) {
      console.log(formatDiagnostic(diagnostic));
    }
    console.log();
  }

  console.log(summary);

  if (hasErrors && options.validation === "strict") {
    console.log();
    throw new ValidationError("Diagram has validation errors");
  }

  if (!hasErrors && result.diagnostics.length === 0) {
    console.log();
    console.log(formatSuccess("Diagram is valid"));
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}
