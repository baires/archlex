import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AWS_SERVICE_CATALOG } from "@archlex/aws";
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import {
  validateCatalogContainment,
  validateCatalogManifest,
} from "@archlex/diagnostics";
import { GCP_SERVICE_CATALOG } from "@archlex/gcp";
import { K8S_SERVICE_CATALOG } from "@archlex/k8s";
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
  catalog?: boolean;
}

export function createValidateCommand(): Command {
  return new Command("validate")
    .description("Validate an ArchLex diagram or internal service catalogs")
    .argument("[input]", "Input .archlex file (or use --stdin)")
    .option(
      "-v, --validation <mode>",
      "Validation mode (normal, strict, off)",
      "strict",
    )
    .option("--stdin", "Read input from stdin")
    .option(
      "--catalog",
      "Validate internal provider service catalogs (AWS, GCP & Kubernetes)",
    )
    .action(async (input: string | undefined, options: ValidateOptions) => {
      try {
        if (options.catalog) {
          await validateCatalogCommand();
        } else {
          await validateCommand(input, options);
        }
      } catch (error) {
        handleError(error);
      }
    });
}

async function validateCatalogCommand(): Promise<void> {
  const spinner = ora("Validating provider service catalogs").start();

  const awsManifestResult = validateCatalogManifest(AWS_SERVICE_CATALOG);
  const awsContainmentDiags = validateCatalogContainment(AWS_SERVICE_CATALOG);
  const awsDiagnostics = [
    ...awsManifestResult.diagnostics,
    ...awsContainmentDiags,
  ];

  const gcpManifestResult = validateCatalogManifest(GCP_SERVICE_CATALOG);
  const gcpContainmentDiags = validateCatalogContainment(GCP_SERVICE_CATALOG);
  const gcpDiagnostics = [
    ...gcpManifestResult.diagnostics,
    ...gcpContainmentDiags,
  ];

  const k8sManifestResult = validateCatalogManifest(K8S_SERVICE_CATALOG);
  const k8sContainmentDiags = validateCatalogContainment(K8S_SERVICE_CATALOG);
  const k8sDiagnostics = [
    ...k8sManifestResult.diagnostics,
    ...k8sContainmentDiags,
  ];

  const totalServices =
    AWS_SERVICE_CATALOG.size +
    GCP_SERVICE_CATALOG.size +
    K8S_SERVICE_CATALOG.size;
  const allDiagnostics = [
    ...awsDiagnostics,
    ...gcpDiagnostics,
    ...k8sDiagnostics,
  ];
  const hasErrors = allDiagnostics.some((d) => d.severity === "error");

  if (hasErrors) {
    spinner.fail(`Catalog validation failed (${allDiagnostics.length} issues)`);
  } else {
    spinner.succeed(`Catalog validation passed (${totalServices} services)`);
  }

  console.log();
  console.log(chalk.bold("Catalog Validation Report"));
  console.log(`  AWS Catalog: ${AWS_SERVICE_CATALOG.size} services`);
  console.log(`  GCP Catalog: ${GCP_SERVICE_CATALOG.size} services`);
  console.log(`  K8S Catalog: ${K8S_SERVICE_CATALOG.size} services`);
  console.log(`  Total Services: ${totalServices} services`);

  if (allDiagnostics.length > 0) {
    console.log();
    for (const diagnostic of allDiagnostics) {
      console.log(formatDiagnostic(diagnostic));
    }
  }

  if (hasErrors) {
    console.log();
    throw new ValidationError("Provider catalogs have validation errors");
  }
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
    providers: [awsProvider(), gcpProvider(), k8sProvider()],
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
