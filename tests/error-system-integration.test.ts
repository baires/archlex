import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import {
  getAllDiagnostics,
  getDiagnosticDefinition,
} from "@archlex/diagnostics";
import type { DiagnosticCode } from "@archlex/diagnostics";
import { describe, expect, test } from "vitest";

describe("Error System Integration", () => {
  test("all diagnostics include remediation", async () => {
    const archlex = createArchLex({
      providers: [awsProvider()],
    });

    const testCases = [
      "lambda ->", // Missing endpoint
      "vpc my-vpc { lambda", // Missing brace
      "lambda: func\nlambda: func", // Duplicate ID
      "provider: aws\nprovider: gcp", // Duplicate directive
      "direction: invalid", // Invalid directive
    ];

    for (const source of testCases) {
      const result = await archlex.render(source);

      for (const diagnostic of result.diagnostics) {
        expect(diagnostic.remediation).toBeDefined();
        expect(diagnostic.remediation).toBeTruthy();

        // Only validate core diagnostics (AL-*) - provider diagnostics (AWS-*, GCP-*) have separate schemas
        if (diagnostic.code.startsWith("AL-")) {
          expect(diagnostic.code).toMatch(/^AL-(PARSE|STRUCT|SEM)-/);
        }
      }
    }
  });

  test("diagnostic definitions match emitted diagnostics", async () => {
    const archlex = createArchLex({
      providers: [awsProvider()],
    });

    const result = await archlex.render("lambda ->");

    for (const diagnostic of result.diagnostics) {
      // Only validate core diagnostics - provider diagnostics aren't in the core registry
      if (!diagnostic.code.startsWith("AL-")) {
        continue;
      }

      const definition = getDiagnosticDefinition(
        diagnostic.code as DiagnosticCode,
      );
      expect(definition).toBeDefined();
      expect(definition?.code).toBe(diagnostic.code);
      expect(definition?.severity).toBe(diagnostic.severity);
    }
  });

  test("all error-severity diagnostics have examples", () => {
    const allDiagnostics = getAllDiagnostics();

    for (const [code, def] of allDiagnostics.entries()) {
      if (def.severity === "error") {
        expect(def.examples).toBeDefined();
        expect(def.examples?.invalid).toBeTruthy();
        expect(def.examples?.valid).toBeTruthy();
      }
    }
  });
});
