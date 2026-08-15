import type { RelationshipAst } from "@archlex/model";
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

  it("parses cluster and namespace scopes for Kubernetes-style nesting", () => {
    const result = parse(`provider k8s
cluster prod {
  namespace frontend {
    web: deployment
  }
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[1]).toMatchObject({
      type: "scope",
      kind: "cluster",
      name: "prod",
      statements: [
        {
          type: "scope",
          kind: "namespace",
          name: "frontend",
          statements: [{ type: "resource", name: "web", kind: "deployment" }],
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
      "AL-PARSE-MISSING-ENDPOINT",
    );
    expect(result.ast.statements).toMatchObject([
      { type: "invalid", recovered: true },
      { type: "resource", kind: "rds" },
    ]);
  });

  it("identifies missing endpoints for labeled and varied arrow types", () => {
    const inputs = [
      'api -[ "HTTP" ]->\nrds',
      "api <->\nrds",
      "api --\nrds",
      "api -.->\nrds",
    ];

    for (const input of inputs) {
      const result = parse(input);
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        "AL-PARSE-MISSING-ENDPOINT",
      );
    }
  });

  it("handles malicious input with repeated '-[' sequences in linear time without ReDoS", () => {
    const measure = (repeats: number): number => {
      const maliciousInput = `api ${"-[".repeat(repeats)}\nrds`;
      const startTime = performance.now();
      const result = parse(maliciousInput);
      expect(result).toBeDefined();
      return performance.now() - startTime;
    };
    // Min of several samples keeps GC pauses and CI runner jitter out of the measurement.
    const sample = (repeats: number): number =>
      Math.min(measure(repeats), measure(repeats), measure(repeats));

    measure(1000); // warm up the JIT before sampling
    const small = sample(2500);
    const large = sample(10000); // 4x the input

    // Linear parsing scales ~4x; polynomial backtracking would blow past 8x.
    // A scaling ratio stays stable on slow CI runners where a fixed
    // wall-clock budget flakes.
    expect(large).toBeLessThan(small * 8);
  });

  it("recovers a missing closing brace at end of input", () => {
    const result = parse("vpc app {\napi: ecs");

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "AL-PARSE-MISSING-BRACE",
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

describe("display labels", () => {
  it("parses a display label on a named resource", () => {
    const result = parse('db: rds["Primary DB"]');

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      type: "resource",
      name: "db",
      kind: "rds",
      displayLabel: "Primary DB",
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 22, offset: 21 },
      },
    });
  });

  it("parses display labels on chain nodes and standalone resources", () => {
    const result = parse('rds["Primary"] > ecs["App"]\nsqs["Queue"]');

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      type: "relationship",
      left: { kind: "rds", displayLabel: "Primary" },
      right: { kind: "ecs", displayLabel: "App" },
    });
    expect(result.ast.statements[1]).toMatchObject({
      type: "resource",
      kind: "sqs",
      displayLabel: "Queue",
    });
  });

  it("decodes escaped characters in display labels", () => {
    const result = parse('db: rds["Primary \\"main\\" DB"]');

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      displayLabel: 'Primary "main" DB',
    });
  });

  it("keeps exact spans for labeled chain nodes", () => {
    const result = parse('rds["A"] > ecs');

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 15, offset: 14 },
      },
      left: {
        span: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 9, offset: 8 },
        },
      },
      right: {
        span: {
          start: { line: 1, column: 12, offset: 11 },
          end: { line: 1, column: 15, offset: 14 },
        },
      },
    });
  });

  it("recovers a missing closing bracket without losing the label", () => {
    const result = parse('db: rds["A"');

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.ast.statements[0]).toMatchObject({
      type: "resource",
      name: "db",
      kind: "rds",
      displayLabel: "A",
    });
  });

  it("recovers an unterminated label string without throwing", () => {
    const result = parse('db: rds["unterminated');

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.ast.statements[0]).toMatchObject({
      type: "resource",
      name: "db",
      kind: "rds",
    });
  });
});

describe("theme directive", () => {
  it("parses theme directive without colon", () => {
    const result = parse("theme dark");

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      type: "directive",
      name: "theme",
      value: "dark",
    });
  });

  it("parses theme directive with colon", () => {
    const result = parse("theme: light");

    expect(result.diagnostics).toEqual([]);
    expect(result.ast.statements[0]).toMatchObject({
      type: "directive",
      name: "theme",
      value: "light",
    });
  });
});
