import { createDiagnostic, diagnosticRegistry } from "@archlex/diagnostics";
import type { Diagnostic, DocumentAst, ParseResult } from "@archlex/model";
import { parserInstance } from "./cst/index.js";
import { ArchLexLexer } from "./lexer/index.js";
import { convertCstToAst, tokenToSpan } from "./visitor/index.js";

export * from "./cst/index.js";
export * from "./lexer/index.js";
export * from "./visitor/index.js";

export function parse(source: string): ParseResult {
  const lexResult = ArchLexLexer.tokenize(source);
  const diagnostics: Diagnostic[] = [];

  for (const err of lexResult.errors) {
    const line = err.line ?? 1;
    const column = err.column ?? 1;
    const length = err.length ?? 1;
    const offset = err.offset ?? 0;
    diagnostics.push(
      createDiagnostic(
        "AL-PARSE-001",
        { token: err.message, line, column },
        {
          start: { line, column, offset },
          end: { line, column: column + length, offset: offset + length },
        },
        [],
        diagnosticRegistry,
      ),
    );
  }

  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.document();

  for (const err of parserInstance.errors) {
    const token = err.token;
    const missingBrace = err.message.includes("RBrace");
    const lineText =
      source
        .slice(0, token.startOffset ?? source.length)
        .split(/\r?\n/)
        .pop() ?? "";
    const missingEndpoint =
      err.message.includes("Identifier") &&
      /(?:<->|<-|->|--|-\.->|\]->|>)\s*$/.test(lineText);

    const code = missingBrace
      ? "AL-PARSE-MISSING-BRACE"
      : missingEndpoint
        ? "AL-PARSE-MISSING-ENDPOINT"
        : "AL-PARSE-002";

    diagnostics.push(
      createDiagnostic(
        code,
        {
          details: err.message,
          scopeType: "scope",
          startLine: token.startLine ?? 1,
        },
        tokenToSpan(token),
        [],
        diagnosticRegistry,
      ),
    );
  }

  const statements = convertCstToAst(cst);
  if (
    diagnostics.some(
      (diagnostic) => diagnostic.code === "AL-PARSE-MISSING-BRACE",
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
      (diagnostic) => diagnostic.code === "AL-PARSE-MISSING-ENDPOINT",
    )
  ) {
    const invalidStatement = statements.find(
      (statement) => statement.type === "invalid",
    );
    diagnostics.push(
      createDiagnostic(
        "AL-PARSE-MISSING-ENDPOINT",
        {},
        invalidStatement?.span ?? tokenToSpan({}),
        [],
        diagnosticRegistry,
      ),
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
      (diagnostic) => diagnostic.code === "AL-PARSE-MISSING-BRACE",
    )
  ) {
    diagnostics.push(
      createDiagnostic(
        "AL-PARSE-MISSING-BRACE",
        { scopeType: "scope", startLine: 1 },
        tokenToSpan({
          startOffset: source.length,
          endOffset: source.length,
        }),
        [],
        diagnosticRegistry,
      ),
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
