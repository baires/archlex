import type { Diagnostic } from "@archlex/model";
import chalk from "chalk";

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const { severity, message, span } = diagnostic;

  const severityColor =
    severity === "error"
      ? chalk.red
      : severity === "warning"
        ? chalk.yellow
        : chalk.blue;

  const severityLabel = severityColor(
    chalk.bold(severity.toUpperCase().padEnd(7)),
  );

  const location = span
    ? chalk.dim(
        `[${span.start.line}:${span.start.column}-${span.end.line}:${span.end.column}]`,
      )
    : "";

  return `${severityLabel} ${message} ${location}`;
}

export function formatDiagnosticSummary(diagnostics: readonly Diagnostic[]): {
  summary: string;
  hasErrors: boolean;
} {
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const infos = diagnostics.filter((d) => d.severity === "info");

  const parts: string[] = [];

  if (errors.length > 0) {
    parts.push(
      chalk.red(`${errors.length} error${errors.length !== 1 ? "s" : ""}`),
    );
  }

  if (warnings.length > 0) {
    parts.push(
      chalk.yellow(
        `${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`,
      ),
    );
  }

  if (infos.length > 0) {
    parts.push(
      chalk.blue(`${infos.length} info${infos.length !== 1 ? "s" : ""}`),
    );
  }

  const summary =
    parts.length > 0 ? parts.join(", ") : chalk.green("No issues found");

  return {
    summary,
    hasErrors: errors.length > 0,
  };
}

export function formatSuccess(message: string): string {
  return chalk.green(`${chalk.bold("✓")} ${message}`);
}

export function formatInfo(message: string): string {
  return chalk.blue(`${chalk.bold("ℹ")} ${message}`);
}
