import { describe, expect, test } from "vitest";
import { semanticDiagnostics } from "./semantic.js";

describe("semanticDiagnostics", () => {
  test("includes all AL-SEM-* codes", () => {
    const codes = [
      "AL-SEM-UNKNOWN-RESOURCE",
      "AL-SEM-UNKNOWN-RELATIONSHIP",
      "AL-SEM-EMPTY-GRAPH",
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
