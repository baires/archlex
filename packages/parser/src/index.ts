import type { Diagnostic, DocumentAst, ParseResult } from "@cloudmer/model";
import { parserInstance } from "./cst/index.js";
import { CloudMerLexer } from "./lexer/index.js";
import { convertCstToAst, tokenToSpan } from "./visitor/index.js";

export * from "./cst/index.js";
export * from "./lexer/index.js";
export * from "./visitor/index.js";

export function parse(source: string): ParseResult {
  const lexResult = CloudMerLexer.tokenize(source);
  const diagnostics: Diagnostic[] = [];

  for (const err of lexResult.errors) {
    const line = err.line ?? 1;
    const column = err.column ?? 1;
    const length = err.length ?? 1;
    const offset = err.offset ?? 0;
    diagnostics.push({
      code: "CM-PARSE-001",
      severity: "error",
      message: `Unexpected token '${err.message}'`,
      span: {
        start: { line, column, offset },
        end: { line, column: column + length, offset: offset + length },
      },
      elements: [],
    });
  }

  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.document();

  for (const err of parserInstance.errors) {
    const token = err.token;
    const missingBrace = err.message.includes("RBrace");
    const missingEndpoint =
      err.message.includes("Identifier") &&
      /(?:>|->|<-|<->|--|-\.->|-\[[^\]]+\]->)\s*(?:\r?\n|$)/.test(source);
    diagnostics.push({
      code: missingBrace
        ? "CM-PARSE-MISSING-BRACE"
        : missingEndpoint
          ? "CM-PARSE-MISSING-ENDPOINT"
          : "CM-PARSE-002",
      severity: "error",
      message: err.message,
      span: tokenToSpan(token),
      elements: [],
    });
  }

  const statements = convertCstToAst(cst);
  if (
    diagnostics.some(
      (diagnostic) => diagnostic.code === "CM-PARSE-MISSING-BRACE",
    )
  ) {
    const recoveredScope = statements.find(
      (statement) => statement.type === "scope",
    ) as (typeof statements)[number] & { recovered?: boolean };
    if (recoveredScope) recoveredScope.recovered = true;
  }

  if (
    statements.some(
      (statement) =>
        statement.type === "invalid" &&
        "reason" in statement &&
        statement.reason === "Relationship endpoint is missing",
    ) &&
    !diagnostics.some(
      (diagnostic) => diagnostic.code === "CM-PARSE-MISSING-ENDPOINT",
    )
  ) {
    const invalidStatement = statements.find(
      (statement) => statement.type === "invalid",
    );
    diagnostics.push({
      code: "CM-PARSE-MISSING-ENDPOINT",
      severity: "error",
      message: "Relationship endpoint is missing.",
      span: invalidStatement?.span ?? tokenToSpan({}),
      elements: [],
    });
  }

  if (
    statements.some(
      (statement) =>
        statement.type === "scope" &&
        "recovered" in statement &&
        statement.recovered,
    ) &&
    !diagnostics.some(
      (diagnostic) => diagnostic.code === "CM-PARSE-MISSING-BRACE",
    )
  ) {
    diagnostics.push({
      code: "CM-PARSE-MISSING-BRACE",
      severity: "error",
      message: "Scope is missing a closing brace.",
      span: tokenToSpan({
        startOffset: source.length,
        endOffset: source.length,
      }),
      elements: [],
    });
  }

  const documentAst: DocumentAst = {
    type: "document",
    span: {
      start: { line: 1, column: 1, offset: 0 },
      end: offsetToPosition(source, source.length),
    },
    statements,
  };

  return { ast: documentAst, diagnostics };
}

function offsetToPosition(source: string, offset: number) {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
    offset,
  };
}
