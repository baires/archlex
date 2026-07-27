import { CstParser } from "chevrotain";
import {
  Colon,
  DirectiveName,
  Dot,
  Identifier,
  LBrace,
  Newline,
  RBrace,
  RelationshipOperator,
  ScopeKind,
  Semicolon,
  StringLiteral,
  allTokens,
} from "../lexer/index.js";

export class CloudMerCstParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: true, nodeLocationTracking: "full" });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.SUBRULE(this.separators);
    this.MANY(() => {
      this.SUBRULE(this.statement);
      this.SUBRULE2(this.separators);
    });
  });

  public separators = this.RULE("separators", () => {
    this.MANY(() =>
      this.OR([
        { ALT: () => this.CONSUME(Newline) },
        { ALT: () => this.CONSUME(Semicolon) },
      ]),
    );
  });

  public statement = this.RULE("statement", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.directive) },
      { ALT: () => this.SUBRULE(this.scope) },
      { ALT: () => this.SUBRULE(this.namedResource) },
      { ALT: () => this.SUBRULE(this.incompleteRelationship) },
      { ALT: () => this.SUBRULE(this.relationshipOrResource) },
    ]);
  });

  public directive = this.RULE("directive", () => {
    this.CONSUME(DirectiveName, { LABEL: "name" });
    this.OR([
      { ALT: () => this.CONSUME(Identifier, { LABEL: "value" }) },
      { ALT: () => this.CONSUME(StringLiteral, { LABEL: "value" }) },
    ]);
  });

  public scope = this.RULE("scope", () => {
    this.CONSUME(ScopeKind, { LABEL: "kind" });
    this.CONSUME(Identifier, { LABEL: "name" });
    this.CONSUME(LBrace);
    this.SUBRULE(this.separators);
    this.MANY(() => {
      this.SUBRULE(this.statement, { LABEL: "nested" });
      this.SUBRULE2(this.separators);
    });
    this.CONSUME(RBrace);
  });

  public namedResource = this.RULE("namedResource", () => {
    this.CONSUME(Identifier, { LABEL: "name" });
    this.CONSUME(Colon);
    this.SUBRULE(this.qualifiedName, { LABEL: "kind" });
  });

  public relationshipOrResource = this.RULE("relationshipOrResource", () => {
    this.SUBRULE(this.qualifiedName, { LABEL: "node" });
    this.MANY(() => {
      this.CONSUME(RelationshipOperator, { LABEL: "op" });
      this.SUBRULE2(this.qualifiedName, { LABEL: "node" });
    });
  });

  public incompleteRelationship = this.RULE("incompleteRelationship", () => {
    this.CONSUME(RelationshipOperator, { LABEL: "op" });
    this.SUBRULE(this.qualifiedName, { LABEL: "node" });
  });

  public qualifiedName = this.RULE("qualifiedName", () => {
    this.CONSUME(Identifier, { LABEL: "part" });
    this.OPTION(() => {
      this.CONSUME(Dot);
      this.CONSUME2(Identifier, { LABEL: "part" });
    });
  });
}

export const parserInstance = new CloudMerCstParser();
