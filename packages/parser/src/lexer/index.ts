import { Lexer, createToken } from "chevrotain";

export const LineComment = createToken({
  name: "LineComment",
  pattern: /(?:#|\/\/)[^\r\n]*/,
  group: Lexer.SKIPPED,
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
  pattern: /(?:provider|direction|validation)\b/,
});
export const ScopeKind = createToken({
  name: "ScopeKind",
  pattern: /(?:account|region|vpc|subnet)\b/,
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
  ScopeKind,
  RelationshipOperator,
  Dot,
  StringLiteral,
  Identifier,
];

export const CloudMerLexer = new Lexer(allTokens);
