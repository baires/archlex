import type { ScopeAst, StatementAst } from "@archlex/model";
import type {
  CursorContext,
  CursorPosition,
  LanguageDocument,
} from "./types.js";

/**
 * Analyze cursor position and determine completion context.
 *
 * Returns the syntactic position (resource-kind, directive-value, etc.)
 * and the surrounding scope path for catalog filtering.
 */
export function getCursorContext(
  document: LanguageDocument,
  offset: number,
): CursorContext {
  // Find the token at or immediately before the cursor
  let tokenIndex = -1;
  for (let i = document.tokens.length - 1; i >= 0; i--) {
    if (document.tokens[i].startOffset <= offset) {
      tokenIndex = i;
      break;
    }
  }

  const token = tokenIndex >= 0 ? document.tokens[tokenIndex] : undefined;
  const prevToken =
    tokenIndex > 0 ? document.tokens[tokenIndex - 1] : undefined;

  // Extract partial token text if cursor is inside a token
  let partialToken: string | undefined;
  if (token && offset >= token.startOffset && offset <= token.endOffset) {
    partialToken = token.image.substring(0, offset - token.startOffset);
  }

  // Determine scope path by walking AST to find enclosing scope
  const scopePath = findScopePath(document.ast, offset);

  // Detect position based on token sequence
  let position: CursorPosition = "unknown";
  let directiveName: string | undefined;

  if (!token) {
    // At start of document or after all tokens
    position = "statement-start";
  } else if (token.kind === "Colon") {
    // Right after colon or cursor after colon
    const beforeColon = findTokenBefore(document.tokens, tokenIndex, [
      "DirectiveName",
      "Identifier",
    ]);
    const directiveToken = findTokenBefore(document.tokens, tokenIndex, [
      "DirectiveName",
    ]);

    if (directiveToken && directiveToken.image === beforeColon?.image) {
      // Colon after directive: "provider:" -> directive value
      position = "directive-value";
      directiveName = directiveToken.image;
    } else {
      // Colon after identifier: "api:" -> resource kind
      position = "resource-kind";
    }
  } else if (token.kind === "Identifier") {
    // Cursor in or after identifier
    if (prevToken?.kind === "Colon") {
      // Identifier directly after colon: "api: lamb|da" -> resource kind
      const beforeColon = findTokenBefore(document.tokens, tokenIndex - 1, [
        "DirectiveName",
        "Identifier",
        "ScopeKind",
      ]);
      const directiveToken = findTokenBefore(document.tokens, tokenIndex - 1, [
        "DirectiveName",
      ]);

      if (directiveToken && directiveToken.image === beforeColon?.image) {
        // After directive colon: completing directive value
        position = "directive-value";
        directiveName = directiveToken.image;
      } else {
        // After resource/scope name colon: completing resource kind
        position = "resource-kind";
      }
    } else if (prevToken?.kind === "DirectiveName") {
      // Already typed directive value, but could be completing it
      position = "directive-value";
      directiveName = prevToken.image;
    } else {
      // Check if there's a colon earlier in this statement
      const colonIndex = findLastColonInStatement(document.tokens, tokenIndex);
      if (colonIndex >= 0) {
        const colonToken = document.tokens[colonIndex];
        const beforeColon = findTokenBefore(document.tokens, colonIndex, [
          "DirectiveName",
          "Identifier",
          "ScopeKind",
        ]);
        const directiveToken = findTokenBefore(document.tokens, colonIndex, [
          "DirectiveName",
        ]);

        if (directiveToken && directiveToken.image === beforeColon?.image) {
          // After directive colon: completing directive value
          position = "directive-value";
          directiveName = directiveToken.image;
        } else {
          // After resource/scope name colon: completing resource kind
          position = "resource-kind";
        }
      } else {
        position = "statement-start";
      }
    }
  } else if (token.kind === "DirectiveName") {
    // Cursor on or after directive name
    position = "directive-value";
    directiveName = token.image;
  } else if (
    token.kind === "Identifier" &&
    prevToken?.kind === "DirectiveName"
  ) {
    // Already typed directive value, but could be completing it
    position = "directive-value";
    directiveName = prevToken.image;
  } else if (token.kind === "RelationshipOperator") {
    // Inside relationship operator: -[kind]->
    // Check if cursor is inside the brackets
    const isInsideBrackets =
      offset > token.startOffset &&
      offset < token.endOffset &&
      token.image.includes("[") &&
      token.image.includes("]");

    if (isInsideBrackets) {
      position = "relationship-kind";

      // Extract relationship endpoints for semantic filtering
      const relationshipContext = extractRelationshipEndpoints(
        document.tokens,
        tokenIndex,
      );

      return {
        position,
        offset,
        providerId: document.providerId,
        scopePath,
        directiveName,
        partialToken,
        relationshipContext,
      };
    }
  } else if (token.kind === "LBracket" || token.kind === "RBracket") {
    // Empty brackets or cursor inside brackets: -[]->
    position = "relationship-kind";

    // Extract relationship endpoints for semantic filtering
    const relationshipContext = extractRelationshipEndpoints(
      document.tokens,
      tokenIndex,
    );

    return {
      position,
      offset,
      providerId: document.providerId,
      scopePath,
      directiveName,
      partialToken,
      relationshipContext,
    };
  } else if (
    token.kind === "LBracket" ||
    (prevToken?.kind === "LBracket" && token.kind === "Identifier")
  ) {
    // Inside relationship kind brackets: -[kind]-> (legacy, if ever tokenized separately)
    position = "relationship-kind";

    // Extract relationship endpoints for semantic filtering
    const relationshipContext = extractRelationshipEndpoints(
      document.tokens,
      tokenIndex,
    );

    return {
      position,
      offset,
      providerId: document.providerId,
      scopePath,
      directiveName,
      partialToken,
      relationshipContext,
    };
  } else if (token.kind === "ScopeKind") {
    // Token is a scope keyword - but check context
    if (prevToken?.kind === "Colon") {
      // After colon: "node: cluster" -> this is a resource kind, not scope
      const beforeColon = findTokenBefore(document.tokens, tokenIndex - 1, [
        "DirectiveName",
        "Identifier",
        "ScopeKind",
      ]);
      const directiveToken = findTokenBefore(document.tokens, tokenIndex - 1, [
        "DirectiveName",
      ]);

      if (directiveToken && directiveToken.image === beforeColon?.image) {
        // After directive colon: completing directive value
        position = "directive-value";
        directiveName = directiveToken.image;
      } else {
        // After resource name colon: completing resource kind
        position = "resource-kind";
      }
    } else {
      // At statement start: this is actually a scope declaration
      position = "scope-kind";
    }
  } else if (
    token.kind === "Newline" ||
    isAfterNewline(document.tokens, tokenIndex, offset)
  ) {
    position = "statement-start";
  } else {
    // Check if we're after a colon (for cases where cursor is beyond last token)
    const colonIndex = document.tokens.findIndex(
      (t, i) => t.kind === "Colon" && i <= tokenIndex,
    );
    if (colonIndex >= 0) {
      const colonToken = document.tokens[colonIndex];
      if (colonToken && colonToken.endOffset < offset) {
        // We're after a colon, check what came before it
        const beforeColon = findTokenBefore(document.tokens, colonIndex, [
          "DirectiveName",
          "Identifier",
        ]);
        const directiveToken = findTokenBefore(document.tokens, colonIndex, [
          "DirectiveName",
        ]);

        if (directiveToken && directiveToken.image === beforeColon?.image) {
          // After directive colon
          position = "directive-value";
          directiveName = directiveToken.image;
        } else if (beforeColon?.kind === "Identifier") {
          // After resource name colon
          position = "resource-kind";
        } else {
          position = "statement-start";
        }
      } else {
        position = "statement-start";
      }
    } else {
      // Default: assume statement start if we can't determine context
      position = "statement-start";
    }
  }

  return {
    position,
    offset,
    providerId: document.providerId,
    scopePath,
    directiveName,
    partialToken,
  };
}

function findScopePath(
  ast: { statements: readonly StatementAst[] },
  offset: number,
): readonly string[] {
  const path: string[] = [];

  function walk(statements: readonly StatementAst[]): boolean {
    for (const statement of statements) {
      if (statement.type === "scope") {
        const scope = statement as ScopeAst;
        const scopeStart = scope.span.start.offset;
        const scopeEnd = scope.span.end.offset;

        // Check if cursor is within this scope's range
        // Use a small buffer (+2) only for incomplete statements at the exact end
        if (offset >= scopeStart && offset <= scopeEnd + 2) {
          path.push(`${scope.kind}:${scope.name}`);

          // Recursively check child scopes
          const foundInChild = walk(scope.statements);

          // If not found in any child, we're in this scope
          return true;
        }
      }
    }
    return false;
  }

  walk(ast.statements);
  return path;
}

function findTokenBefore(
  tokens: readonly { kind: string; image: string }[],
  fromIndex: number,
  kinds: string[],
): { kind: string; image: string } | undefined {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (kinds.includes(tokens[i].kind)) {
      return tokens[i] as { kind: string; image: string };
    }
  }
  return undefined;
}

function findLastColonInStatement(
  tokens: readonly { kind: string }[],
  fromIndex: number,
): number {
  // Look backwards from current position to find a colon
  // Stop at newline (indicates a new statement)
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (tokens[i].kind === "Newline") {
      return -1; // Hit a newline before finding a colon
    }
    if (tokens[i].kind === "Colon") {
      return i;
    }
  }
  return -1;
}

function isAfterNewline(
  tokens: readonly { kind: string; endOffset: number }[],
  tokenIndex: number,
  offset: number,
): boolean {
  if (tokenIndex < 0) return true;

  const token = tokens[tokenIndex];
  if (token.kind === "Newline") return true;

  // Check if cursor is after a newline token
  for (let i = tokenIndex; i >= 0; i--) {
    if (tokens[i].kind === "Newline" && tokens[i].endOffset < offset) {
      // Check if there are only whitespace/nothing between newline and cursor
      const nextToken = i + 1 < tokens.length ? tokens[i + 1] : undefined;
      if (!nextToken || nextToken.endOffset < offset) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract relationship source and target symbols for semantic filtering.
 *
 * Handles three cases:
 * 1. RelationshipOperator token (e.g., "-[kind]->") - source before, target after
 * 2. LBracket/RBracket tokens (e.g., "-[]->") - source before, target after arrow
 * 3. Separate bracket tokens with identifier inside (legacy)
 */
function extractRelationshipEndpoints(
  tokens: readonly { kind: string; image: string }[],
  operatorIndex: number,
): { sourceSymbol?: string; targetSymbol?: string } | undefined {
  let sourceSymbol: string | undefined;
  let targetSymbol: string | undefined;

  const operatorToken = tokens[operatorIndex];

  // Handle RelationshipOperator token (entire -[kind]-> as one token)
  if (operatorToken.kind === "RelationshipOperator") {
    // Scan backwards from operator to find source
    for (let i = operatorIndex - 1; i >= 0; i--) {
      const token = tokens[i];

      if (token.kind === "Newline") {
        break;
      }

      if (token.kind === "Identifier") {
        sourceSymbol = token.image;
        break;
      }
    }

    // Scan forwards from operator to find target
    for (let i = operatorIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.kind === "Newline") {
        break;
      }

      if (token.kind === "Identifier") {
        targetSymbol = token.image;
        break;
      }
    }
  } else if (
    operatorToken.kind === "LBracket" ||
    operatorToken.kind === "RBracket"
  ) {
    // Handle separate bracket tokens (empty brackets -[]->)
    // Scan backwards from bracket to find source
    for (let i = operatorIndex - 1; i >= 0; i--) {
      const token = tokens[i];

      if (token.kind === "Newline") {
        break;
      }

      if (token.kind === "Identifier") {
        sourceSymbol = token.image;
        break;
      }
    }

    // Scan forwards from bracket to find target (after arrow)
    let foundArrow = false;
    for (let i = operatorIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.kind === "Newline") {
        break;
      }

      if (token.kind === "RelationshipOperator" || token.kind === "Arrow") {
        foundArrow = true;
        continue;
      }

      if (foundArrow && token.kind === "Identifier") {
        targetSymbol = token.image;
        break;
      }
    }
  } else {
    // Handle separate bracket tokens with identifier inside (legacy path)
    // Scan backwards from bracket to find source
    for (let i = operatorIndex - 1; i >= 0; i--) {
      const token = tokens[i];

      if (token.kind === "Newline") {
        break;
      }

      if (token.kind === "Identifier") {
        const prevToken = i > 0 ? tokens[i - 1] : undefined;
        const prevPrevToken = i > 1 ? tokens[i - 2] : undefined;

        if (prevToken?.kind === "Dot" && prevPrevToken?.kind === "Identifier") {
          sourceSymbol = prevPrevToken.image;
          break;
        }
        sourceSymbol = token.image;
        break;
      }
    }

    // Scan forwards from bracket to find target
    let foundArrow = false;
    for (let i = operatorIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.kind === "Newline") {
        break;
      }

      if (
        token.kind === "Arrow" ||
        token.kind === "RelationshipOperator" ||
        token.image.includes("->") ||
        token.image.includes("<-")
      ) {
        foundArrow = true;
        continue;
      }

      if (foundArrow && token.kind === "Identifier") {
        targetSymbol = token.image;
        break;
      }
    }
  }

  if (!sourceSymbol && !targetSymbol) {
    return undefined;
  }

  return { sourceSymbol, targetSymbol };
}
