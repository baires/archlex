import { CstParser } from "chevrotain";
import {
  Arrow,
  GreaterThan,
  Identifier,
  Newline,
  allTokens,
} from "../lexer/index.js";

export class CloudMerCstParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: true });
    this.performSelfAnalysis();
  }

  public document = this.RULE("document", () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.statement) },
        { ALT: () => this.CONSUME(Newline) },
      ]);
    });
  });

  public statement = this.RULE("statement", () => {
    this.SUBRULE(this.relationship);
  });

  public relationship = this.RULE("relationship", () => {
    this.SUBRULE1(this.chainNode, { LABEL: "left" });
    this.OR([
      { ALT: () => this.CONSUME(GreaterThan, { LABEL: "op" }) },
      { ALT: () => this.CONSUME(Arrow, { LABEL: "op" }) },
    ]);
    this.SUBRULE2(this.chainNode, { LABEL: "right" });
  });

  public chainNode = this.RULE("chainNode", () => {
    this.CONSUME(Identifier, { LABEL: "name" });
  });
}

export const parserInstance = new CloudMerCstParser();
