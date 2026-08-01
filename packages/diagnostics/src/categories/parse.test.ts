import { describe, test, expect } from "vitest";
import { parseDiagnostics } from "./parse.js";

describe("parseDiagnostics", () => {
  test("includes CM-PARSE-001 definition", () => {
    const def = parseDiagnostics.get("CM-PARSE-001");
    expect(def).toBeDefined();
    expect(def?.code).toBe("CM-PARSE-001");
    expect(def?.category).toBe("parse");
    expect(def?.severity).toBe("error");
    expect(def?.message).toBeTruthy();
    expect(def?.remediation).toBeTruthy();
  });

  test("includes CM-PARSE-MISSING-ENDPOINT definition", () => {
    const def = parseDiagnostics.get("CM-PARSE-MISSING-ENDPOINT");
    expect(def).toBeDefined();
    expect(def?.examples).toBeDefined();
    expect(def?.examples?.invalid).toBeTruthy();
    expect(def?.examples?.valid).toBeTruthy();
  });

  test("includes CM-PARSE-MISSING-BRACE definition", () => {
    const def = parseDiagnostics.get("CM-PARSE-MISSING-BRACE");
    expect(def).toBeDefined();
  });

  test("all diagnostics have required fields", () => {
    for (const [code, def] of parseDiagnostics.entries()) {
      expect(def.code).toBe(code);
      expect(def.category).toBe("parse");
      expect(def.message).toBeTruthy();
      expect(def.remediation).toBeTruthy();
      if (def.severity === "error") {
        expect(def.examples).toBeDefined();
      }
    }
  });
});
