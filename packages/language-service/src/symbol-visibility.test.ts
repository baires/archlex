import type { CatalogMetadata } from "@archlex/model";
import { describe, expect, it } from "vitest";
import { createCompletionEngine } from "./completions.js";
import { analyzeLanguageDocument } from "./document.js";

const mockCatalog: CatalogMetadata = {
  directives: {
    provider: ["aws", "azure"],
    direction: ["LR", "RL", "TB", "BT"],
    validation: ["normal", "strict", "off"],
    theme: ["light", "dark"],
  },
  containmentScopes: ["vpc", "subnet", "region"],
  relationshipKinds: ["connects", "uses", "depends"],
  language: {
    directives: [],
    scopes: [],
    operators: [],
    relationships: [
      {
        kind: "connects",
        displayName: "Connects To",
        allowedSources: ["lambda", "api-gateway"],
        allowedTargets: ["dynamodb", "s3"],
      },
      {
        kind: "uses",
        displayName: "Uses",
        allowedSources: ["lambda"],
        allowedTargets: ["s3", "dynamodb"],
      },
    ],
  },
  providers: {
    aws: {
      id: "aws",
      name: "AWS",
      catalogVersion: "1.0.0",
      supportedScopes: ["vpc", "subnet"],
      services: [
        {
          id: "lambda",
          displayName: "Lambda Function",
          category: "compute",
          aliases: [],
        },
        {
          id: "dynamodb",
          displayName: "DynamoDB Table",
          category: "database",
          aliases: [],
        },
        {
          id: "s3",
          displayName: "S3 Bucket",
          category: "storage",
          aliases: [],
        },
        {
          id: "api-gateway",
          displayName: "API Gateway",
          category: "networking",
          aliases: [],
        },
      ],
      relationships: [],
    },
  },
};

describe("Symbol Visibility", () => {
  it("should only suggest symbols from current and parent scopes", () => {
    const source = `
provider: aws

vpc main {
  api: api-gateway

  subnet backend {
    fn: lambda
  }
}

vpc other {
  db: dynamodb
}
`;

    const document = analyzeLanguageDocument(source);
    const engine = createCompletionEngine(mockCatalog);

    // Get completions inside "backend" subnet at resource-kind position
    // Add a line "test:" and position cursor right at the colon
    const sourceWithCursor = source.replace(
      "fn: lambda",
      "fn: lambda\n    test:",
    );
    const documentWithCursor = analyzeLanguageDocument(sourceWithCursor);
    const cursorOffset = sourceWithCursor.indexOf("test:") + 4; // At the colon

    const completions = engine.complete(documentWithCursor, cursorOffset);

    const symbolCompletions = completions.filter((c) => c.kind === "symbol");
    const symbolNames = symbolCompletions.map((c) => c.label);

    // Should see: api (parent vpc), fn (same subnet scope)
    // Should NOT see: db (sibling vpc)
    expect(symbolNames).toContain("api");
    expect(symbolNames).toContain("fn");
    expect(symbolNames).not.toContain("db");
  });

  it("should suggest sibling symbols in the same scope", () => {
    const source = `
provider: aws

api: api-gateway
fn: lambda
db: dynamodb
test:`;

    const document = analyzeLanguageDocument(source);
    const engine = createCompletionEngine(mockCatalog);

    // Get completions right at "test:" colon
    const cursorOffset = source.indexOf("test:") + 4;
    const completions = engine.complete(document, cursorOffset);

    const symbolCompletions = completions.filter((c) => c.kind === "symbol");
    const symbolNames = symbolCompletions.map((c) => c.label);

    expect(symbolNames).toContain("api");
    expect(symbolNames).toContain("fn");
    expect(symbolNames).toContain("db");
  });

  it("should not suggest child scope symbols from parent", () => {
    const source = `
provider: aws

vpc main {
  subnet backend {
    fn: lambda
  }

  test:
}
`;

    const document = analyzeLanguageDocument(source);
    const engine = createCompletionEngine(mockCatalog);

    // Cursor right at "test:" colon in vpc scope (parent of subnet)
    const cursorOffset = source.indexOf("test:") + 4;
    const completions = engine.complete(document, cursorOffset);

    const symbolCompletions = completions.filter((c) => c.kind === "symbol");
    const symbolNames = symbolCompletions.map((c) => c.label);

    // Should not see 'fn' from child subnet scope
    expect(symbolNames).not.toContain("fn");
  });
});

describe("Semantic Relationship Completion", () => {
  it("should penalize incompatible relationship sources", () => {
    const source = `
provider: aws

db: dynamodb
fn: lambda

db -[]-> fn
`;

    const document = analyzeLanguageDocument(source);
    const engine = createCompletionEngine(mockCatalog);

    // Cursor inside relationship brackets
    const bracketToken = document.tokens.find((t) => t.kind === "LBracket");
    const cursorOffset = bracketToken
      ? bracketToken.startOffset + 1
      : source.indexOf("-[]->") + 2;
    const completions = engine.complete(document, cursorOffset);

    const relationshipCompletions = completions.filter(
      (c) => c.kind === "relationship",
    );

    // "connects" should be penalized (dynamodb not in allowedSources)
    // "uses" should be highly penalized (dynamodb not in allowedSources)
    const connectsCompletion = relationshipCompletions.find(
      (c) => c.id === "relationship:connects",
    );

    expect(connectsCompletion).toBeDefined();

    // Should have penalty scores > 0
    expect(connectsCompletion?.sortScore).toBeGreaterThan(0);
  });

  it("should prioritize compatible relationships", () => {
    const source = `
provider: aws

fn: lambda
db: dynamodb

fn -[]-> db
`;

    const document = analyzeLanguageDocument(source);
    const engine = createCompletionEngine(mockCatalog);

    // Cursor inside relationship brackets
    const bracketToken = document.tokens.find((t) => t.kind === "LBracket");
    const cursorOffset = bracketToken
      ? bracketToken.startOffset + 1
      : source.indexOf("-[]->") + 2;
    const completions = engine.complete(document, cursorOffset);

    const relationshipCompletions = completions.filter(
      (c) => c.kind === "relationship",
    );

    // "connects" should have score 0 (lambda -> dynamodb is compatible)
    const connectsCompletion = relationshipCompletions.find(
      (c) => c.id === "relationship:connects",
    );

    expect(connectsCompletion).toBeDefined();
    expect(connectsCompletion?.sortScore).toBe(0);
  });

  it("should penalize incompatible relationship targets", () => {
    const source = `
provider: aws

fn: lambda
api: api-gateway

fn -[]-> api
`;

    const document = analyzeLanguageDocument(source);
    const engine = createCompletionEngine(mockCatalog);

    // Cursor inside relationship brackets
    const bracketToken = document.tokens.find((t) => t.kind === "LBracket");
    const cursorOffset = bracketToken
      ? bracketToken.startOffset + 1
      : source.indexOf("-[]->") + 2;
    const completions = engine.complete(document, cursorOffset);

    const relationshipCompletions = completions.filter(
      (c) => c.kind === "relationship",
    );

    // "connects" should be penalized (api-gateway not in allowedTargets)
    const connectsCompletion = relationshipCompletions.find(
      (c) => c.id === "relationship:connects",
    );

    expect(connectsCompletion).toBeDefined();
    expect(connectsCompletion?.sortScore).toBeGreaterThan(0);
  });
});
