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
  } else if (
    token.kind === "LBracket" ||
    (prevToken?.kind === "LBracket" && token.kind === "Identifier")
  ) {
    // Inside relationship kind brackets: -[kind]->
    position = "relationship-kind";
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

  function walk(statements: readonly StatementAst[]) {
    for (const statement of statements) {
      if (statement.type === "scope") {
        const scope = statement as ScopeAst;
        const scopeStart = scope.span.start.offset;
        const scopeEnd = scope.span.end.offset;

        // Include cursor positions within or immediately after scope end
        // (to handle incomplete statements at end of scope)
        if (offset >= scopeStart && offset <= scopeEnd + 10) {
          path.push(`${scope.kind}:${scope.name}`);
          walk(scope.statements);
          return;
        }
      }
    }
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
