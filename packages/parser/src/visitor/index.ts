import type {
  DirectiveAst,
  InvalidStatementAst,
  RelationshipAst,
  ResourceAst,
  ScopeAst,
  SourcePosition,
  SourceSpan,
  StatementAst,
} from "@archlex/model";

export interface TokenLocation {
  startLine?: number;
  startColumn?: number;
  startOffset?: number;
  endLine?: number;
  endColumn?: number;
  endOffset?: number;
  image?: string;
  isInsertedInRecovery?: boolean;
}

interface CstNodeLike {
  name?: string;
  children?: Record<string, unknown[]>;
  location?: TokenLocation;
}

function position(
  value: TokenLocation | undefined,
  edge: "start" | "end",
): SourcePosition {
  const isEnd = edge === "end";
  const rawLine =
    (isEnd ? value?.endLine : value?.startLine) ?? value?.startLine;
  const rawColumn =
    (isEnd ? value?.endColumn : value?.startColumn) ?? value?.startColumn;
  const rawOffset =
    (isEnd ? value?.endOffset : value?.startOffset) ?? value?.startOffset;
  return {
    line: isAvailableLocation(rawLine) ? rawLine : 1,
    column: isAvailableLocation(rawColumn) ? rawColumn + (isEnd ? 1 : 0) : 1,
    offset: isAvailableLocation(rawOffset) ? rawOffset + (isEnd ? 1 : 0) : 0,
  };
}

// Chevrotain marks unavailable token/CST locations with -1 (NaN before v13).
export function isAvailableLocation(
  value: number | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function tokenToSpan(token: TokenLocation): SourceSpan {
  return { start: position(token, "start"), end: position(token, "end") };
}

function nodeSpan(node: CstNodeLike): SourceSpan {
  return {
    start: position(node.location, "start"),
    end: position(node.location, "end"),
  };
}

function firstToken(node: CstNodeLike, key: string): TokenLocation | undefined {
  return node.children?.[key]?.[0] as TokenLocation | undefined;
}

function childNodes(node: CstNodeLike, key: string): CstNodeLike[] {
  return (node.children?.[key] ?? []) as CstNodeLike[];
}

function qualifiedName(node: CstNodeLike | undefined): {
  value: string;
  span: SourceSpan;
  recovered: boolean;
} {
  const parts = (node?.children?.part ?? []) as TokenLocation[];
  return {
    value: parts
      .map((part) => part.image)
      .filter(Boolean)
      .join("."),
    span: node ? nodeSpan(node) : tokenToSpan({}),
    recovered:
      parts.length === 0 ||
      parts.some((part) => part.isInsertedInRecovery || !part.image),
  };
}

function displayLabel(node: CstNodeLike | undefined): string | undefined {
  const token = firstToken(node ?? {}, "value");
  if (!token?.image || token.isInsertedInRecovery) return undefined;
  return decodeString(token.image);
}

function chainNode(node: CstNodeLike | undefined): {
  value: string;
  span: SourceSpan;
  recovered: boolean;
  displayLabel?: string;
} {
  const base = qualifiedName(childNodes(node ?? {}, "name")[0]);
  const label = displayLabel(childNodes(node ?? {}, "displayLabel")[0]);
  return {
    ...base,
    span: node ? nodeSpan(node) : base.span,
    displayLabel: label,
  };
}

function decodeString(value: string): string {
  if (!value.startsWith('"')) return value;
  try {
    return JSON.parse(value) as string;
  } catch {
    return value.slice(1, -1);
  }
}

function operatorParts(image: string): {
  arrow: string;
  kind?: string;
  label?: string;
} {
  const kindMatch = image.match(/^-\[([a-zA-Z_][a-zA-Z0-9_-]*)\]->/);
  const labelMatch = image.match(
    /(?:\|((?:\\\||[^|])*)\||("(?:\\.|[^"\\])*"))$/,
  );
  const arrow = kindMatch
    ? `-[${kindMatch[1]}]->`
    : (image.match(/^(?:<->|-.->|<-|--|->|>)/)?.[0] ?? image);
  const labelValue = labelMatch?.[1] ?? labelMatch?.[2];
  return {
    arrow,
    kind: kindMatch?.[1],
    label:
      labelValue === undefined
        ? undefined
        : decodeString(labelValue.replace(/\\\|/g, "|")),
  };
}

function invalid(node: CstNodeLike, reason: string): InvalidStatementAst {
  return {
    type: "invalid",
    raw: "",
    reason,
    recovered: true,
    span: nodeSpan(node),
  };
}

function convertStatement(wrapper: CstNodeLike): StatementAst[] {
  const child = Object.values(wrapper.children ?? {}).flat()[0] as
    | CstNodeLike
    | undefined;
  if (!child) return [invalid(wrapper, "Missing statement")];

  if (child.name === "directive") {
    const name = firstToken(child, "name");
    const value = firstToken(child, "value");
    if (!name?.image || !value?.image)
      return [invalid(child, "Incomplete directive")];
    const ast: DirectiveAst = {
      type: "directive",
      name: name.image,
      value: decodeString(value.image),
      span: nodeSpan(child),
    };
    return [ast];
  }

  if (child.name === "namedResource") {
    const name = firstToken(child, "name");
    const kind = qualifiedName(childNodes(child, "kind")[0]);
    if (!name?.image || kind.recovered)
      return [invalid(child, "Incomplete resource declaration")];
    const ast: ResourceAst = {
      type: "resource",
      name: name.image,
      kind: kind.value,
      displayLabel: displayLabel(childNodes(child, "displayLabel")[0]),
      span: nodeSpan(child),
    };
    return [ast];
  }

  if (child.name === "scope") {
    const kind = firstToken(child, "kind");
    const name = firstToken(child, "name");
    const closing = firstToken(child, "RBrace");
    const nested = childNodes(child, "nested").flatMap(convertStatement);
    if (!kind?.image || !name?.image)
      return [invalid(child, "Incomplete scope")];
    const ast: ScopeAst = {
      type: "scope",
      kind: kind.image as ScopeAst["kind"],
      name: name.image,
      statements: nested,
      recovered: closing?.isInsertedInRecovery || undefined,
      span: nodeSpan(child),
    };
    return [ast];
  }

  if (child.name === "relationshipOrResource") {
    const nodes = childNodes(child, "node").map(chainNode);
    const operators = (child.children?.op ?? []) as TokenLocation[];
    if (operators.length === 0 && nodes[0] && !nodes[0].recovered) {
      const resource: ResourceAst = {
        type: "resource",
        kind: nodes[0].value,
        displayLabel: nodes[0].displayLabel,
        span: nodes[0].span,
      };
      return [resource];
    }
    if (
      nodes.some((node) => node.recovered) ||
      nodes.length !== operators.length + 1
    ) {
      const statement = invalid(child, "Relationship endpoint is missing");
      const left = nodes[0];
      statement.partialRelationship = {
        left:
          left && !left.recovered
            ? {
                kind: left.value,
                span: left.span,
                displayLabel: left.displayLabel,
              }
            : undefined,
        arrow: operators[0]?.image ?? "->",
      };
      return [statement];
    }
    return operators.map((operator, index): RelationshipAst => {
      const left = nodes[index] as NonNullable<(typeof nodes)[number]>;
      const right = nodes[index + 1] as NonNullable<(typeof nodes)[number]>;
      return {
        type: "relationship",
        span: { start: left.span.start, end: right.span.end },
        left: {
          kind: left.value,
          span: left.span,
          displayLabel: left.displayLabel,
        },
        right: {
          kind: right.value,
          span: right.span,
          displayLabel: right.displayLabel,
        },
        ...operatorParts(operator.image ?? ""),
      };
    });
  }

  if (child.name === "incompleteRelationship") {
    const right = chainNode(childNodes(child, "node")[0]);
    const operator = firstToken(child, "op");
    const statement = invalid(child, "Relationship endpoint is missing");
    statement.partialRelationship = {
      right: right.recovered
        ? undefined
        : {
            kind: right.value,
            span: right.span,
            displayLabel: right.displayLabel,
          },
      arrow: operator?.image ?? "->",
    };
    return [statement];
  }

  return [invalid(child, "Unrecognized statement")];
}

export function convertCstToAst(cst: unknown): StatementAst[] {
  const document = cst as CstNodeLike;
  return childNodes(document, "statement").flatMap(convertStatement);
}
