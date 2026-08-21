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

  test("rejects malformed relationship kinds", () => {
    const diagnostics = validateRelationshipDefinitions(
      [],
      [{ kind: "batch_invokes", displayName: "Batch invokes" }],
      { knownKinds: [] },
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        elements: ["batch_invokes"],
      }),
    ]);
  });

  test("requires unknown provider relationships to be explicit extensions", () => {
    const diagnostics = validateRelationshipDefinitions(
      [],
      [{ kind: "targets", displayName: "Targets" }],
      { knownKinds: ["routes"] },
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        elements: ["targets"],
      }),
    ]);
  });

  test("accepts an explicitly declared provider relationship extension", () => {
    const diagnostics = validateRelationshipDefinitions(
      [],
      [
        {
          kind: "targets",
          displayName: "Targets",
          providerSpecific: true,
        },
      ],
      { knownKinds: ["routes"] },
    );

    expect(diagnostics).toEqual([]);
  });
});
