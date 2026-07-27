import type { RelationshipAst } from "@cloudmer/model";
import { describe, expect, it } from "vitest";
import { parse } from "./index.js";

describe("Phase 1 relationship chains", () => {
  it("expands a three-resource shorthand chain into two relationships", () => {
    const result = parse("rds-proxy > rds > ecs");

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements).toHaveLength(2);
    expect(
      result.ast.statements.map((statement) => {
        const relationship = statement as RelationshipAst;
        return [
          relationship.left.kind,
          relationship.arrow,
          relationship.right.kind,
        ];
      }),
    ).toEqual([
      ["rds-proxy", ">", "rds"],
      ["rds", ">", "ecs"],
    ]);
  });
});

describe("Phase 2 language", () => {
  it("parses directives, qualified and named resources, comments, and nested scopes", () => {
    const result = parse(`provider aws
direction TB
validation strict
# deployment boundary
account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        api: aws.ecs // workload
      }
    }
  }
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements.slice(0, 3)).toMatchObject([
      { type: "directive", name: "provider", value: "aws" },
      { type: "directive", name: "direction", value: "TB" },
      { type: "directive", name: "validation", value: "strict" },
    ]);
    expect(result.ast.statements[3]).toMatchObject({
      type: "scope",
      kind: "account",
      name: "production",
      statements: [
        {
          type: "scope",
          kind: "region",
          statements: [
            {
              type: "scope",
              kind: "vpc",
              statements: [
                {
                  type: "scope",
                  kind: "subnet",
                  statements: [
                    {
                      type: "resource",
                      name: "api",
                      kind: "aws.ecs",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["a > b", ">", undefined, undefined],
    ["a -> b", "->", undefined, undefined],
    ["a <- b", "<-", undefined, undefined],
    ["a <-> b", "<->", undefined, undefined],
    ["a -- b", "--", undefined, undefined],
    ["a -.-> b", "-.->", undefined, undefined],
    ["a -[writes]-> b", "-[writes]->", "writes", undefined],
    ["a ->|PostgreSQL/TLS| b", "->", undefined, "PostgreSQL/TLS"],
    [
      "a -[writes]->|PostgreSQL/TLS| b",
      "-[writes]->",
      "writes",
      "PostgreSQL/TLS",
    ],
  ])("preserves relationship syntax for %s", (source, arrow, kind, label) => {
    const result = parse(source);
    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      type: "relationship",
      arrow,
      kind,
      label,
    });
  });

  it("recovers a missing endpoint as an invalid statement without throwing", () => {
    const result = parse("api ->\nrds");

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CM-PARSE-MISSING-ENDPOINT",
    );
    expect(result.ast.statements).toMatchObject([
      { type: "invalid", recovered: true },
      { type: "resource", kind: "rds" },
    ]);
  });

  it("recovers a missing closing brace at end of input", () => {
    const result = parse("vpc app {\napi: ecs");

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CM-PARSE-MISSING-BRACE",
    );
    expect(result.ast.statements[0]).toMatchObject({
      type: "scope",
      recovered: true,
      statements: [{ type: "resource", name: "api", kind: "ecs" }],
    });
  });

  it("tracks exact end-exclusive UTF-16 spans", () => {
    const result = parse("a -> b");
    expect(result.ast.statements[0]).toMatchObject({
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 7, offset: 6 },
      },
      left: {
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 2, offset: 1 },
        },
      },
      right: {
        span: {
          start: { line: 1, column: 6, offset: 5 },
          end: { line: 1, column: 7, offset: 6 },
        },
      },
    });
  });
});
