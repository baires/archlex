import { describe, expect, test } from "vitest";
import { validateRelationshipDefinitions } from "./relationship-validator.js";

describe("validateRelationshipDefinitions", () => {
  test("rejects relationship constraints that reference unknown services", () => {
    const diagnostics = validateRelationshipDefinitions(
      [
        {
          id: "service",
          displayName: "Service",
          category: "networking",
          aliases: [],
        },
      ],
      [
        {
          kind: "targets",
          displayName: "Targets",
          allowedTargets: ["deployment"],
        },
      ],
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        elements: ["targets", "deployment"],
      }),
    ]);
  });

  test("rejects duplicate relationship kinds", () => {
    const diagnostics = validateRelationshipDefinitions(
      [],
      [
        { kind: "routes", displayName: "Routes" },
        { kind: "routes", displayName: "Routes again" },
      ],
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        elements: ["routes"],
      }),
    ]);
  });
});
