import { describe, expect, test } from "vitest";
import { structuralDiagnostics } from "./structural.js";

describe("structuralDiagnostics", () => {
  test("includes all AL-STRUCT-* codes", () => {
    const codes = [
      "AL-STRUCT-DUPLICATE-ID",
      "AL-STRUCT-CONFLICTING-LABEL",
      "AL-STRUCT-DUPLICATE-DIRECTIVE",
      "AL-STRUCT-LATE-DIRECTIVE",
      "AL-STRUCT-INVALID-DIRECTIVE",
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
