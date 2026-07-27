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

interface ChainNodeCst {
  children?: { name?: TokenLocation[] };
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
        | { node?: ChainNodeCst[]; op?: TokenLocation[] }
        | undefined;

      if (relChildren) {
        const nodes = (relChildren.node ?? [])
          .map((node) => node.children?.name?.[0])
          .filter((token): token is TokenLocation => Boolean(token?.image));
        const operators = relChildren.op ?? [];

        for (let index = 0; index < operators.length; index += 1) {
          const leftNode = nodes[index];
          const opToken = operators[index];
          const rightNode = nodes[index + 1];
          if (!leftNode?.image || !opToken?.image || !rightNode?.image)
            continue;

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
