import { describe, test, expect } from "vitest";
import { getAllDiagnostics, getDiagnosticDefinition } from "./registry.js";

describe("registry", () => {
  test("getAllDiagnostics returns all diagnostic definitions", () => {
    const all = getAllDiagnostics();
    expect(all.size).toBeGreaterThan(0);
    expect(all.has("CM-PARSE-001")).toBe(true);
    expect(all.has("CM-STRUCT-DUPLICATE-ID")).toBe(true);
    expect(all.has("CM-SEM-UNKNOWN-RESOURCE")).toBe(true);
  });

  test("getDiagnosticDefinition returns correct definition", () => {
    const def = getDiagnosticDefinition("CM-PARSE-MISSING-ENDPOINT");
    expect(def).toBeDefined();
    expect(def?.code).toBe("CM-PARSE-MISSING-ENDPOINT");
  });

  test("getDiagnosticDefinition returns undefined for unknown code", () => {
    const def = getDiagnosticDefinition("CM-UNKNOWN-CODE" as any);
    expect(def).toBeUndefined();
  });
});
