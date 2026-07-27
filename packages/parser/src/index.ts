import type {
  Diagnostic,
  DocumentAst,
  ParseResult,
  RelationshipAst,
  SourceSpan,
  StatementAst,
} from "@cloudmer/model";
import { CstParser, Lexer, createToken } from "chevrotain";

// Tokens
export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z0-9_\-]+/,
});
export const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });
export const Arrow = createToken({ name: "Arrow", pattern: /->/ });
export const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"[^"]*"/,
});
export const Newline = createToken({ name: "Newline", pattern: /\r?\n/ });
export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
});

export const allTokens = [
  Newline,
  Arrow,
  GreaterThan,
  StringLiteral,
  Identifier,
  WhiteSpace,
];

export const CloudMerLexer = new Lexer(allTokens);

class CloudMerCstParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.statement) },
        { ALT: () => this.CONSUME(Newline) },
      ]);
    });
  });

  public statement = this.RULE("statement", () => {
    this.SUBRULE(this.relationship);
  });

  public relationship = this.RULE("relationship", () => {
    this.SUBRULE1(this.chainNode, { LABEL: "left" });
    this.OR([
      { ALT: () => this.CONSUME(GreaterThan, { LABEL: "op" }) },
      { ALT: () => this.CONSUME(Arrow, { LABEL: "op" }) },
    ]);
    this.SUBRULE2(this.chainNode, { LABEL: "right" });
  });

  public chainNode = this.RULE("chainNode", () => {
    this.CONSUME(Identifier, { LABEL: "name" });
  });
}

export const parserInstance = new CloudMerCstParser();

interface TokenLocation {
  startLine?: number;
  startColumn?: number;
  startOffset?: number;
  endLine?: number;
  endColumn?: number;
  endOffset?: number;
  image?: string;
}

function tokenToSpan(token: TokenLocation): SourceSpan {
  return {
    start: {
      line: token.startLine ?? 1,
      column: token.startColumn ?? 1,
      offset: token.startOffset ?? 0,
    },
    end: {
      line: token.endLine ?? token.startLine ?? 1,
      column: token.endColumn ?? token.startColumn ?? 1,
      offset: token.endOffset ?? token.startOffset ?? 0,
    },
  };
}

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
  const cst = parserInstance.document() as unknown as Record<string, unknown>;

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

  const statements: StatementAst[] = [];

  const children = cst?.children as Record<string, unknown[]> | undefined;
  if (children?.statement) {
    for (const stmtCst of children.statement as Record<string, unknown>[]) {
      const relCstList = stmtCst.children as
        | Record<string, unknown[]>
        | undefined;
      const relCst = relCstList?.relationship?.[0] as
        | Record<string, unknown>
        | undefined;
      const relChildren = relCst?.children as
        | Record<string, TokenLocation[]>
        | undefined;

      if (relChildren) {
        const leftNode = relChildren.left?.[0];
        const opToken = relChildren.op?.[0];
        const rightNode = relChildren.right?.[0];

        if (
          leftNode &&
          opToken &&
          rightNode &&
          leftNode.image &&
          rightNode.image &&
          opToken.image
        ) {
          const relAst: RelationshipAst = {
            type: "relationship",
            span: {
              start: tokenToSpan(leftNode).start,
              end: tokenToSpan(rightNode).end,
            },
            left: {
              kind: leftNode.image,
              span: tokenToSpan(leftNode),
            },
            right: {
              kind: rightNode.image,
              span: tokenToSpan(rightNode),
            },
            arrow: opToken.image,
          };
          statements.push(relAst);
        }
      }
    }
  }

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
