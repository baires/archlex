import { Lexer, createToken } from "chevrotain";

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
