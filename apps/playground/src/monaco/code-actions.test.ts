import type { Diagnostic } from "@cloudmer/model";
import { describe, expect, test } from "vitest";
import { getCodeActionsForDiagnostic } from "./code-actions.js";

describe("getCodeActionsForDiagnostic", () => {
  test("provides actions for missing endpoint", () => {
    const diagnostic: Diagnostic = {
      code: "CM-PARSE-MISSING-ENDPOINT",
      severity: "error",
      message: "Expected relationship endpoint",
      span: {
        start: { line: 1, column: 10, offset: 9 },
        end: { line: 1, column: 12, offset: 11 },
      },
      elements: [],
      remediation: "Add a service identifier",
    };

    const actions = getCodeActionsForDiagnostic(diagnostic, "lambda ->");
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].title).toContain("Add");
    expect(actions[0].edit).toBeDefined();
  });

  test("provides actions for invalid directive value", () => {
    const diagnostic: Diagnostic = {
      code: "CM-STRUCT-INVALID-DIRECTIVE",
      severity: "error",
      message: "Invalid value 'diagonal' for 'direction'",
      span: {
        start: { line: 1, column: 12, offset: 11 },
        end: { line: 1, column: 20, offset: 19 },
      },
      elements: [],
      remediation: "Use one of: LR, RL, TB, BT",
    };

    const actions = getCodeActionsForDiagnostic(
      diagnostic,
      "direction: diagonal",
    );
    expect(actions.length).toBe(4); // One for each valid value
    expect(actions[0].title).toMatch(/LR|RL|TB|BT/);
  });

  test("returns empty array for non-actionable diagnostics", () => {
    const diagnostic: Diagnostic = {
      code: "CM-SEM-UNKNOWN-RESOURCE",
      severity: "info",
      message: "Unknown service",
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 10, offset: 9 },
      },
      elements: [],
      remediation: "Check service name",
    };

    const actions = getCodeActionsForDiagnostic(diagnostic, "unknown-svc");
    expect(actions).toEqual([]);
  });
});
