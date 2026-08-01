import type { Diagnostic, DocumentAst, ParseResult } from "@cloudmer/model";
import {
  createDiagnostic,
  diagnosticRegistry,
} from "@cloudmer/diagnostics";
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
    diagnostics.push(
      createDiagnostic(
        "CM-PARSE-001",
        { token: err.message, line, column },
        {
          start: { line, column, offset },
          end: { line, column: column + length, offset: offset + length },
        },
        [],
        diagnosticRegistry
      )
    );
  }

  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.document();

  for (const err of parserInstance.errors) {
    const token = err.token;
    const missingBrace = err.message.includes("RBrace");
    const missingEndpoint =
      err.message.includes("Identifier") &&
      /(?:>|->|<-|<->|--|-\.->|-\[[^\]]+\]->)\s*(?:\r?\n|$)/.test(source);

    const code = missingBrace
      ? "CM-PARSE-MISSING-BRACE"
      : missingEndpoint
        ? "CM-PARSE-MISSING-ENDPOINT"
        : "CM-PARSE-002";

    diagnostics.push(
      createDiagnostic(
        code,
        { details: err.message, scopeType: "scope", startLine: token.startLine ?? 1 },
        tokenToSpan(token),
        [],
        diagnosticRegistry
      )
    );
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
    diagnostics.push(
      createDiagnostic(
        "CM-PARSE-MISSING-ENDPOINT",
        {},
        invalidStatement?.span ?? tokenToSpan({}),
        [],
        diagnosticRegistry
      )
    );
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
    diagnostics.push(
      createDiagnostic(
        "CM-PARSE-MISSING-BRACE",
        { scopeType: "scope", startLine: 1 },
        tokenToSpan({
          startOffset: source.length,
          endOffset: source.length,
        }),
        [],
        diagnosticRegistry
      )
    );
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
