import { createToken, type IToken, Lexer } from "chevrotain";

export const LineComment = createToken({
  name: "LineComment",
  pattern: /(?:#|\/\/)[^\r\n]*/,
  group: "comments",
});
export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
});
export const Newline = createToken({ name: "Newline", pattern: /\r?\n/ });
export const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });
export const DirectiveName = createToken({
  name: "DirectiveName",
  pattern: /(?:provider|direction|validation|theme)\b/,
});
export const ScopeKind = createToken({
  name: "ScopeKind",
  pattern: /(?:account|region|vpc|subnet|cluster|namespace)\b/,
});
export const RelationshipOperator = createToken({
  name: "RelationshipOperator",
  pattern:
    /(?:-\[[a-zA-Z_][a-zA-Z0-9_-]*\]->|->)(?:\|(?:\\\||[^|])*\||"(?:\\.|[^"\\])*")?|<->|-.->|<-|--|>/,
});
export const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"(?:\\.|[^"\\])*"/,
});
export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z_][a-zA-Z0-9_-]*/,
});

const presentationLine = /(?:title|sub|footer)[ \t]*:[^\r\n]*/y;

function isHeader(tokens: readonly IToken[]): boolean {
  for (let index = tokens.length - 1; index >= 0; index--) {
    const type = tokens[index].tokenType;
    // A prior presentation token already established that its prefix is a header.
    if (type === PresentationDirective) return true;
    if (type === Newline || type === Semicolon) continue;

    if (type !== Identifier && type !== StringLiteral) return false;
    if (tokens[index - 1]?.tokenType === Colon) index--;
    if (tokens[--index]?.tokenType !== DirectiveName) return false;
  }
  return true;
}

// A whole presentation line is a token so comments, punctuation, and spaces
// in its value never enter the graph grammar.
export const PresentationDirective = createToken({
  name: "PresentationDirective",
  pattern: (source, offset, tokens) => {
    const previous = tokens.at(-1);
    if (
      previous &&
      previous.tokenType !== Newline &&
      previous.tokenType !== Semicolon
    ) {
      return null;
    }
    presentationLine.lastIndex = offset;
    const match = presentationLine.exec(source);
    return match && isHeader(tokens) ? match : null;
  },
  start_chars_hint: ["t", "s", "f"],
  line_breaks: false,
});

export const allTokens = [
  LineComment,
  WhiteSpace,
  Newline,
  Semicolon,
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  Colon,
  DirectiveName,
  PresentationDirective,
  ScopeKind,
  RelationshipOperator,
  Dot,
  StringLiteral,
  Identifier,
];

export const ArchLexLexer = new Lexer(allTokens);
