import type { Diagnostic } from "@archlex/model";
import { describe, expect, test } from "vitest";
import { formatDiagnostic } from "./format-diagnostic.js";

describe("formatDiagnostic", () => {
  test("formats error diagnostic with source context", () => {
    const diagnostic: Diagnostic = {
      code: "AL-PARSE-MISSING-ENDPOINT",
      severity: "error",
      message: "Expected relationship endpoint after arrow operator",
      span: {
        start: { line: 1, column: 10, offset: 9 },
        end: { line: 1, column: 12, offset: 11 },
      },
      elements: [],
      remediation: "Add a service identifier after the arrow",
    };

    const source = "lambda ->";
    const formatted = formatDiagnostic(diagnostic, source, "test.cm");

    expect(formatted).toContain("error[AL-PARSE-MISSING-ENDPOINT]");
    expect(formatted).toContain("test.cm:1:10");
    expect(formatted).toContain("lambda ->");
    expect(formatted).toContain("Add a service identifier");
  });

  test("formats warning diagnostic", () => {
    const diagnostic: Diagnostic = {
      code: "AL-SEM-UNKNOWN-RESOURCE",
      severity: "warning",
      message: "Unknown service type",
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 10, offset: 9 },
      },
      elements: [],
      remediation: "Check service name",
    };

    const formatted = formatDiagnostic(diagnostic, "unknown", "test.cm");
    expect(formatted).toContain("warning[AL-SEM-UNKNOWN-RESOURCE]");
  });

  test("handles multi-line source context", () => {
    const diagnostic: Diagnostic = {
      code: "AL-STRUCT-DUPLICATE-ID",
      severity: "error",
      message: "Duplicate resource ID",
      span: {
        start: { line: 2, column: 1, offset: 10 },
        end: { line: 2, column: 10, offset: 19 },
      },
      elements: [],
      remediation: "Rename to unique ID",
    };

    const source = "lambda: func1\nlambda: func1";
    const formatted = formatDiagnostic(diagnostic, source, "test.cm");

    expect(formatted).toContain("2 |");
    expect(formatted).toContain("lambda: func1");
  });
});
