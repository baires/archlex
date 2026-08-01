import chalk from "chalk";

export class ArchLexError extends Error {
  constructor(
    message: string,
    public exitCode = 2,
  ) {
    super(message);
    this.name = "ArchLexError";
  }
}

export class ValidationError extends ArchLexError {
  constructor(message: string) {
    super(message, 1);
    this.name = "ValidationError";
  }
}

export class FileNotFoundError extends ArchLexError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 2);
    this.name = "FileNotFoundError";
  }
}

export class ParseError extends ArchLexError {
  constructor(message: string) {
    super(message, 2);
    this.name = "ParseError";
  }
}

export function formatError(error: unknown): string {
  if (error instanceof ArchLexError) {
    return chalk.red(`${chalk.bold("Error:")} ${error.message}`);
  }

  if (error instanceof Error) {
    return chalk.red(`${chalk.bold("Error:")} ${error.message}`);
  }

  return chalk.red(`${chalk.bold("Error:")} ${String(error)}`);
}

export function handleError(error: unknown): never {
  console.error(formatError(error));

  if (error instanceof ArchLexError) {
    process.exit(error.exitCode);
  }

  process.exit(2);
}
