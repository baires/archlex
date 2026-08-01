import { describe, test, expect } from "vitest";
import { semanticDiagnostics } from "./semantic.js";

describe("semanticDiagnostics", () => {
  test("includes all CM-SEM-* codes", () => {
    const codes = [
      "CM-SEM-UNKNOWN-RESOURCE",
      "CM-SEM-UNKNOWN-RELATIONSHIP",
      "CM-SEM-EMPTY-GRAPH",
    ];

    for (const code of codes) {
      const def = semanticDiagnostics.get(code);
      expect(def).toBeDefined();
      expect(def?.code).toBe(code);
      expect(def?.category).toBe("semantic");
    }
  });

  test("all diagnostics have required fields", () => {
    for (const [code, def] of semanticDiagnostics.entries()) {
      expect(def.code).toBe(code);
      expect(def.category).toBe("semantic");
      expect(def.message).toBeTruthy();
      expect(def.remediation).toBeTruthy();
    }
  });
});
