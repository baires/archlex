import { describe, expect, it } from "vitest";
import { validatePrTitle } from "../scripts/validate-pr-title.mjs";

describe("validatePrTitle", () => {
  describe("valid titles", () => {
    it("accepts feat with scope", () => {
      const result = validatePrTitle("feat(core): add validation");
      expect(result.valid).toBe(true);
    });

    it("accepts fix without scope", () => {
      const result = validatePrTitle("fix: avoid blank output");
      expect(result.valid).toBe(true);
    });

    it("accepts breaking change with exclamation", () => {
      const result = validatePrTitle("feat(core)!: change options");
      expect(result.valid).toBe(true);
    });

    it("accepts docs type", () => {
      const result = validatePrTitle("docs: update readme");
      expect(result.valid).toBe(true);
    });

    it("accepts test type", () => {
      const result = validatePrTitle("test: add unit tests");
      expect(result.valid).toBe(true);
    });

    it("accepts refactor type", () => {
      const result = validatePrTitle("refactor(parser): simplify logic");
      expect(result.valid).toBe(true);
    });

    it("accepts perf type", () => {
      const result = validatePrTitle("perf: optimize rendering");
      expect(result.valid).toBe(true);
    });

    it("accepts build type", () => {
      const result = validatePrTitle("build: update dependencies");
      expect(result.valid).toBe(true);
    });

    it("accepts ci type", () => {
      const result = validatePrTitle("ci: add workflow");
      expect(result.valid).toBe(true);
    });

    it("accepts chore type", () => {
      const result = validatePrTitle("chore: cleanup code");
      expect(result.valid).toBe(true);
    });

    it("accepts revert type", () => {
      const result = validatePrTitle("revert: undo changes");
      expect(result.valid).toBe(true);
    });

    it("accepts scope with multiple words", () => {
      const result = validatePrTitle("feat(layout-elk): add new algorithm");
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid titles", () => {
    it("rejects missing type", () => {
      const result = validatePrTitle("add validation");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("type");
    });

    it("rejects uppercase type", () => {
      const result = validatePrTitle("FEAT: add feature");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("lowercase");
    });

    it("rejects terminal period", () => {
      const result = validatePrTitle("feat: add feature.");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("period");
    });

    it("rejects unsupported type", () => {
      const result = validatePrTitle("feature: add new thing");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("supported");
    });

    it("rejects missing colon", () => {
      const result = validatePrTitle("feat add feature");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("colon");
    });

    it("rejects missing description", () => {
      const result = validatePrTitle("feat:");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("description");
    });

    it("rejects empty string", () => {
      const result = validatePrTitle("");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("empty");
    });

    it("rejects type without separator", () => {
      const result = validatePrTitle("feat(core) add feature");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("colon");
    });
  });
});
