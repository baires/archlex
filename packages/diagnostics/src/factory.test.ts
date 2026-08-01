import { describe, test, expect } from "vitest";
import { createDiagnostic } from "./factory.js";
import type { DiagnosticDefinition } from "./types.js";

const mockRegistry = new Map<string, DiagnosticDefinition>([
  [
    "CM-TEST-001",
    {
      code: "CM-TEST-001" as any,
      category: "parse",
      severity: "error",
      message: "Test error at ${line}:${column}",
      remediation: "Fix the issue at line ${line}",
    },
  ],
]);

describe("createDiagnostic", () => {
  test("creates diagnostic with interpolated message and remediation", () => {
    const diagnostic = createDiagnostic(
      "CM-TEST-001" as any,
      { line: 5, column: 10 },
      {
        start: { line: 5, column: 10, offset: 50 },
        end: { line: 5, column: 15, offset: 55 },
      },
      [],
      mockRegistry
    );

    expect(diagnostic.code).toBe("CM-TEST-001");
    expect(diagnostic.severity).toBe("error");
    expect(diagnostic.message).toBe("Test error at 5:10");
    expect(diagnostic.remediation).toBe("Fix the issue at line 5");
    expect(diagnostic.span).toEqual({
      start: { line: 5, column: 10, offset: 50 },
      end: { line: 5, column: 15, offset: 55 },
    });
  });

  test("throws error for unknown diagnostic code", () => {
    expect(() =>
      createDiagnostic(
        "CM-UNKNOWN-001" as any,
        {},
        {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        [],
        mockRegistry
      )
    ).toThrow("Unknown diagnostic code: CM-UNKNOWN-001");
  });

  test("includes elements in diagnostic", () => {
    const diagnostic = createDiagnostic(
      "CM-TEST-001" as any,
      { line: 5, column: 10 },
      {
        start: { line: 5, column: 10, offset: 50 },
        end: { line: 5, column: 15, offset: 55 },
      },
      ["element1", "element2"],
      mockRegistry
    );

    expect(diagnostic.elements).toEqual(["element1", "element2"]);
  });
});
