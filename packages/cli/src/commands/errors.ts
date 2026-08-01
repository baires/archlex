import {
  getAllDiagnostics,
  getDiagnosticDefinition,
} from "@cloudmer/diagnostics";
import type { DiagnosticCode } from "@cloudmer/diagnostics";
import chalk from "chalk";
import { Command } from "commander";

export function createErrorsCommand(): Command {
  const cmd = new Command("errors");
  cmd.description("View error code documentation");

  // List all errors
  cmd
    .command("list")
    .description("List all error codes")
    .option("-c, --category <category>", "Filter by category")
    .option("-s, --severity <severity>", "Filter by severity")
    .action((options) => {
      const allDiagnostics = getAllDiagnostics();
      let diagnostics = Array.from(allDiagnostics.values());

      if (options.category) {
        diagnostics = diagnostics.filter(
          (d) => d.category === options.category,
        );
      }

      if (options.severity) {
        diagnostics = diagnostics.filter(
          (d) => d.severity === options.severity,
        );
      }

      // Group by category
      const byCategory = new Map<string, typeof diagnostics>();
      for (const d of diagnostics) {
        if (!byCategory.has(d.category)) {
          byCategory.set(d.category, []);
        }
        byCategory.get(d.category)?.push(d);
      }

      // Display
      for (const [category, items] of byCategory.entries()) {
        console.log(chalk.bold(`\n${category.toUpperCase()} ERRORS\n`));

        for (const item of items) {
          const severityColor =
            item.severity === "error"
              ? chalk.red
              : item.severity === "warning"
                ? chalk.yellow
                : chalk.blue;

          console.log(
            `  ${chalk.bold(item.code)} ${severityColor(`[${item.severity}]`)}`,
          );
          console.log(`    ${item.message}\n`);
        }
      }
    });

  // Show specific error
  cmd.argument("[code]", "Error code to display").action((code?: string) => {
    if (!code) {
      // Default to list
      cmd.commands
        .find((c) => c.name() === "list")
        ?.parseAsync([], { from: "user" });
      return;
    }

    const definition = getDiagnosticDefinition(code as DiagnosticCode);

    if (!definition) {
      console.error(chalk.red(`Error code not found: ${code}`));
      process.exit(1);
    }

    // Display detailed info
    const severityColor =
      definition.severity === "error"
        ? chalk.red
        : definition.severity === "warning"
          ? chalk.yellow
          : chalk.blue;

    console.log(chalk.bold(`\n${definition.code}`));
    console.log(
      severityColor(`[${definition.severity}]`) +
        chalk.gray(` · ${definition.category}`),
    );
    console.log();

    console.log(chalk.bold("Description"));
    console.log(definition.message);
    console.log();

    console.log(chalk.bold("Remediation"));
    console.log(definition.remediation);
    console.log();

    if (definition.examples) {
      console.log(chalk.bold("Example"));
      console.log(chalk.red("Invalid:"));
      console.log(definition.examples.invalid);
      console.log();
      console.log(chalk.green("Valid:"));
      console.log(definition.examples.valid);
      console.log();
    }

    if (definition.relatedCodes && definition.relatedCodes.length > 0) {
      console.log(chalk.bold("Related Codes"));
      console.log(definition.relatedCodes.join(", "));
      console.log();
    }
  });

  return cmd;
}
