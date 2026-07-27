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
