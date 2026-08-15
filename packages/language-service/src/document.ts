import type {
  DirectiveAst,
  DocumentAst,
  RelationshipAst,
  ResourceAst,
  ScopeAst,
  StatementAst,
} from "@archlex/model";
import { ArchLexLexer } from "@archlex/parser";
import { parse } from "@archlex/parser";
import type {
  DocumentSymbol,
  LanguageDocument,
  LanguageToken,
} from "./types.js";

function convertToken(token: {
  tokenType: { name: string };
  image: string;
  startOffset: number;
  endOffset?: number;
}): LanguageToken {
  return {
    kind: token.tokenType.name,
    image: token.image,
    startOffset: token.startOffset,
    endOffset: token.endOffset ?? token.startOffset + token.image.length,
  };
}

export function analyzeLanguageDocument(source: string): LanguageDocument {
  // Tokenize with comment preservation
  const lexResult = ArchLexLexer.tokenize(source);
  const tokens: LanguageToken[] = [
    ...lexResult.tokens.map(convertToken),
    ...(lexResult.groups.comments ?? []).map(convertToken),
  ].sort((a, b) => a.startOffset - b.startOffset);

  // Parse for recoverable AST
  const parseResult = parse(source);
  const ast = parseResult.ast;

  // Collect symbols and directives
  const symbols: DocumentSymbol[] = [];
  const symbolNames = new Set<string>();
  const declaredDirectives = new Set<string>();
  let providerId: string | undefined;

  function addSymbol(
    name: string,
    resourceKind: string,
    scopePath: readonly string[],
    declarationOffset: number,
    providerId?: string,
  ) {
    const key = `${scopePath.join("/")}/${name}`;
    if (!symbolNames.has(key)) {
      symbolNames.add(key);
      symbols.push({
        name,
        resourceKind,
        providerId,
        scopePath,
        declarationOffset,
      });
    }
  }

  function walkStatements(
    statements: readonly StatementAst[],
    scopePath: readonly string[],
  ) {
    for (const statement of statements) {
      if (statement.type === "directive") {
        const directive = statement as DirectiveAst;
        declaredDirectives.add(directive.name);
        if (directive.name === "provider" && !providerId && directive.value) {
          providerId = directive.value;
        }
      } else if (statement.type === "scope") {
        const scope = statement as ScopeAst;
        const newPath = [...scopePath, `${scope.kind}:${scope.name}`];
        walkStatements(scope.statements, newPath);
      } else if (statement.type === "resource") {
        const resource = statement as ResourceAst;
        // Extract provider from qualified kind (e.g., "aws.lambda" -> provider: "aws", kind: "lambda")
        const parts = resource.kind.split(".");
        const extractedProvider = parts.length > 1 ? parts[0] : undefined;
        const actualKind =
          parts.length > 1 ? parts.slice(1).join(".") : resource.kind;

        if (resource.name) {
          addSymbol(
            resource.name,
            actualKind,
            scopePath,
            resource.span.start.offset,
            extractedProvider,
          );
        } else {
          // Implicit resource (no name, just kind)
          addSymbol(
            actualKind,
            actualKind,
            scopePath,
            resource.span.start.offset,
            extractedProvider,
          );
        }
      } else if (statement.type === "relationship") {
        const relationship = statement as RelationshipAst;

        // Add symbols for relationship endpoints that might not have declarations
        if (relationship.left) {
          addSymbol(
            relationship.left.kind,
            relationship.left.kind,
            scopePath,
            relationship.left.span.start.offset,
          );
        }
        if (relationship.right) {
          addSymbol(
            relationship.right.kind,
            relationship.right.kind,
            scopePath,
            relationship.right.span.start.offset,
          );
        }
      }
    }
  }

  walkStatements(ast.statements, []);

  return {
    source,
    ast,
    tokens,
    symbols,
    providerId,
    declaredDirectives,
  };
}
