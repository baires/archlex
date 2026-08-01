import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { awsProvider, createCloudMer, gcpProvider } from "@cloudmer/core";
import type { ValidationMode } from "@cloudmer/model";
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
  formatInfo,
  formatSuccess,
} from "../utils/formatters.js";
import { svgToPng, writeSvg } from "../utils/output.js";

interface RenderOptions {
  output?: string;
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: ValidationMode;
  theme?: "light" | "dark";
  scale?: string;
  backgroundColor?: string;
  stdin?: boolean;
}

export function createRenderCommand(): Command {
  return new Command("render")
    .description("Render a CloudMer diagram to SVG or PNG")
    .argument("[input]", "Input .cloudmer file (or use --stdin)")
    .option("-o, --output <path>", "Output file path (.svg or .png)")
    .option(
      "-d, --direction <direction>",
      "Layout direction (LR, RL, TB, BT)",
      "TB",
    )
    .option(
      "-v, --validation <mode>",
      "Validation mode (normal, strict, off)",
      "normal",
    )
    .option("-t, --theme <theme>", "Theme for rendering (light, dark)", "dark")
    .option("-s, --scale <number>", "Scale factor for PNG export", "2")
    .option(
      "-b, --background-color <color>",
      "Background color for PNG",
      "transparent",
    )
    .option("--stdin", "Read input from stdin")
    .action(async (input: string | undefined, options: RenderOptions) => {
      try {
        await renderCommand(input, options);
      } catch (error) {
        handleError(error);
      }
    });
}

async function renderCommand(
  input: string | undefined,
  options: RenderOptions,
): Promise<void> {
  // Read input
  const spinner = ora("Reading input").start();

  let source: string;
  let inputPath: string | undefined;

  try {
    if (options.stdin) {
      // Read from stdin
      source = await readStdin();
      spinner.succeed("Read from stdin");
    } else if (input) {
      // Read from file
      inputPath = resolve(input);
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

  // Parse and render
  spinner.start("Rendering diagram");

  const cloudmer = createCloudMer({
    providers: [awsProvider(), gcpProvider()],
  });

  let result: Awaited<ReturnType<typeof cloudmer.render>>;

  try {
    result = await cloudmer.render(source, {
      direction: options.direction,
      validation: options.validation,
      theme: options.theme,
    });
  } catch (error) {
    spinner.fail("Failed to parse diagram");
    throw new ParseError(
      error instanceof Error ? error.message : String(error),
    );
  }

  // Check for errors
  const { summary, hasErrors } = formatDiagnosticSummary(result.diagnostics);

  if (result.diagnostics.length > 0) {
    spinner.stop();
    console.log();
    for (const diagnostic of result.diagnostics) {
      console.log(formatDiagnostic(diagnostic));
    }
    console.log();
    console.log(summary);
    console.log();
  }

  if (hasErrors && options.validation === "strict") {
    spinner.fail("Rendering failed due to validation errors");
    throw new ValidationError("Diagram has validation errors");
  }

  if (!result.svg) {
    spinner.fail("No SVG output generated");
    throw new ParseError("Failed to generate diagram");
  }

  spinner.succeed("Diagram rendered");

  // Determine output format and path
  const outputPath = options.output
    ? resolve(options.output)
    : inputPath
      ? inputPath.replace(/\.cloudmer$/, ".svg")
      : undefined;

  const outputFormat = outputPath
    ? extname(outputPath).toLowerCase() === ".png"
      ? "png"
      : "svg"
    : "svg";

  // Output
  if (!outputPath) {
    // Write to stdout
    console.log(result.svg);
    return;
  }

  if (outputFormat === "png") {
    // Export to PNG
    const exportSpinner = ora("Exporting to PNG").start();

    try {
      await svgToPng(result.svg, outputPath, {
        scale: Number.parseFloat(options.scale || "2"),
        backgroundColor: options.backgroundColor,
      });

      exportSpinner.succeed(
        formatSuccess(`PNG exported to ${chalk.cyan(outputPath)}`),
      );
    } catch (error) {
      exportSpinner.fail("PNG export failed");
      throw error;
    }
  } else {
    // Write SVG
    const writeSpinner = ora("Writing SVG").start();

    try {
      await writeSvg(result.svg, outputPath);
      writeSpinner.succeed(
        formatSuccess(`SVG saved to ${chalk.cyan(outputPath)}`),
      );
    } catch (error) {
      writeSpinner.fail("Failed to write SVG");
      throw error;
    }
  }

  // Show info about diagnostics if not in strict mode
  if (result.diagnostics.length > 0 && options.validation !== "strict") {
    console.log();
    console.log(
      formatInfo("Run with --validation strict to fail on validation errors"),
    );
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}
