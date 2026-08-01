import { describe, test, expect } from "vitest";
import { structuralDiagnostics } from "./structural.js";

describe("structuralDiagnostics", () => {
  test("includes all CM-STRUCT-* codes", () => {
    const codes = [
      "CM-STRUCT-DUPLICATE-ID",
      "CM-STRUCT-CONFLICTING-LABEL",
      "CM-STRUCT-DUPLICATE-DIRECTIVE",
      "CM-STRUCT-LATE-DIRECTIVE",
      "CM-STRUCT-INVALID-DIRECTIVE",
    ];

    for (const code of codes) {
      const def = structuralDiagnostics.get(code);
      expect(def).toBeDefined();
      expect(def?.code).toBe(code);
      expect(def?.category).toBe("structural");
    }
  });

  test("all diagnostics have required fields", () => {
    for (const [code, def] of structuralDiagnostics.entries()) {
      expect(def.code).toBe(code);
      expect(def.category).toBe("structural");
      expect(def.message).toBeTruthy();
      expect(def.remediation).toBeTruthy();
      if (def.severity === "error") {
        expect(def.examples).toBeDefined();
      }
    }
  });
});
