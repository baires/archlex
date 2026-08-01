import { awsProvider } from "@cloudmer/aws";
import { createCloudMer } from "@cloudmer/core";
import {
  getAllDiagnostics,
  getDiagnosticDefinition,
} from "@cloudmer/diagnostics";
import type { DiagnosticCode } from "@cloudmer/diagnostics";
import { describe, expect, test } from "vitest";

describe("Error System Integration", () => {
  test("all diagnostics include remediation", async () => {
    const cloudmer = createCloudMer({
      providers: [awsProvider],
    });

    const testCases = [
      "lambda ->", // Missing endpoint
      "vpc my-vpc { lambda", // Missing brace
      "lambda: func\nlambda: func", // Duplicate ID
      "provider: aws\nprovider: gcp", // Duplicate directive
      "direction: invalid", // Invalid directive
    ];

    for (const source of testCases) {
      const result = await cloudmer.render(source);

      for (const diagnostic of result.diagnostics) {
        expect(diagnostic.remediation).toBeDefined();
        expect(diagnostic.remediation).toBeTruthy();
        expect(diagnostic.code).toMatch(/^CM-(PARSE|STRUCT|SEM)-/);
      }
    }
  });

  test("diagnostic definitions match emitted diagnostics", async () => {
    const cloudmer = createCloudMer({
      providers: [awsProvider],
    });

    const result = await cloudmer.render("lambda ->");

    for (const diagnostic of result.diagnostics) {
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
