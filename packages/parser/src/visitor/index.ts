import type {
  RelationshipAst,
  SourceSpan,
  StatementAst,
} from "@cloudmer/model";

export interface TokenLocation {
  startLine?: number;
  startColumn?: number;
  startOffset?: number;
  endLine?: number;
  endColumn?: number;
  endOffset?: number;
  image?: string;
}

export function tokenToSpan(token: TokenLocation): SourceSpan {
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

export function convertCstToAst(cst: unknown): StatementAst[] {
  const statements: StatementAst[] = [];
  const cstObj = cst as unknown as Record<string, unknown>;
  const children = cstObj?.children as Record<string, unknown[]> | undefined;

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

  return statements;
}
