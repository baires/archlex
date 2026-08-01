import { describe, expect, test } from "vitest";
import { getAllDiagnostics, getDiagnosticDefinition } from "./registry.js";

describe("registry", () => {
  test("getAllDiagnostics returns all diagnostic definitions", () => {
    const all = getAllDiagnostics();
    expect(all.size).toBeGreaterThan(0);
    expect(all.has("AL-PARSE-001")).toBe(true);
    expect(all.has("AL-STRUCT-DUPLICATE-ID")).toBe(true);
    expect(all.has("AL-SEM-UNKNOWN-RESOURCE")).toBe(true);
  });

  test("getDiagnosticDefinition returns correct definition", () => {
    const def = getDiagnosticDefinition("AL-PARSE-MISSING-ENDPOINT");
    expect(def).toBeDefined();
    expect(def?.code).toBe("AL-PARSE-MISSING-ENDPOINT");
  });

  test("getDiagnosticDefinition returns undefined for unknown code", () => {
    // biome-ignore lint/suspicious/noExplicitAny: mock invalid code for test
    const def = getDiagnosticDefinition("AL-UNKNOWN-CODE" as any);
    expect(def).toBeUndefined();
  });
});
