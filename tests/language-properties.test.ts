import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "@archlex/parser";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

describe("language robustness", () => {
  it("terminates with finite spans for arbitrary UTF-16 input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (source) => {
        const result = parse(source);
        expect(result.ast.span.end.offset).toBe(source.length);
        for (const diagnostic of result.diagnostics) {
          expect(Number.isFinite(diagnostic.span.start.offset)).toBe(true);
          expect(Number.isFinite(diagnostic.span.end.offset)).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("executes every documented archlex example", () => {
    const markdown = readFileSync(
      resolve(process.cwd(), "docs/specs/language.md"),
      "utf8",
    );
    const examples = Array.from(
      markdown.matchAll(/```archlex\n([\s\S]*?)```/g),
      (match) => match[1] ?? "",
    );

    expect(examples.length).toBeGreaterThan(0);
    for (const source of examples) {
      expect(parse(source).diagnostics, source).toEqual([]);
    }
  });
});
