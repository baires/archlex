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
    diagnostics.push({
      code: "CM-PARSE-002",
      severity: "error",
      message: err.message,
      span: tokenToSpan(token),
      elements: [],
    });
  }

  const statements = convertCstToAst(cst);

  const documentAst: DocumentAst = {
    type: "document",
    span: {
      start: { line: 1, column: 1, offset: 0 },
      end: {
        line: 1,
        column: Math.max(1, source.length),
        offset: source.length,
      },
    },
    statements,
  };

  return { ast: documentAst, diagnostics };
}
