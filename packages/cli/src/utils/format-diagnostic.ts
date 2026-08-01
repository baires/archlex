import type { Diagnostic } from "@archlex/model";
import chalk from "chalk";

export function formatDiagnostic(
  diagnostic: Diagnostic,
  source: string,
  filename: string,
): string {
  const lines = source.split("\n");
  const { span, severity, code, message, remediation } = diagnostic;

  // Severity color
  const severityColor =
    severity === "error"
      ? chalk.red
      : severity === "warning"
        ? chalk.yellow
        : chalk.blue;

  // Header line: error[CODE]: message
  let output = severityColor(`${severity}[${chalk.bold(code)}]: ${message}\n`);

  // Location: --> file:line:column
  output += chalk.blue(
    `  --> ${filename}:${span.start.line}:${span.start.column}\n`,
  );

  // Source context with line numbers
  const lineNumber = span.start.line;
  const gutterWidth = String(lineNumber).length + 1;

  output += chalk.blue(`${" ".repeat(gutterWidth)}|\n`);

  if (lineNumber > 0 && lineNumber <= lines.length) {
    const lineContent = lines[lineNumber - 1];
    output += chalk.blue(`${lineNumber.toString().padStart(gutterWidth)} | `);
    output += `${lineContent}\n`;

    // Caret pointer
    const caretColumn = span.start.column;
    const caretLength = Math.max(1, span.end.column - span.start.column);
    const caret = "^".repeat(caretLength);

    output += chalk.blue(`${" ".repeat(gutterWidth)}| `);
    output += " ".repeat(caretColumn - 1);
    output += severityColor(caret);

    if (remediation) {
      output += ` ${severityColor(remediation)}`;
    }
    output += "\n";
  }

  output += chalk.blue(`${" ".repeat(gutterWidth)}|\n`);

  // Help section
  if (remediation) {
    output += `${chalk.bold("   = help: ")}${remediation}\n`;
  }

  return output;
}

export function formatDiagnosticList(
  diagnostics: readonly Diagnostic[],
  source: string,
  filename: string,
): string {
  if (diagnostics.length === 0) {
    return "";
  }

  return diagnostics
    .map((d) => formatDiagnostic(d, source, filename))
    .join("\n");
}
