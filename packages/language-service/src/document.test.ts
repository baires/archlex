import { describe, expect, it } from "vitest";
import { analyzeLanguageDocument } from "./document.js";

describe("analyzeLanguageDocument", () => {
  it("collects directives, scopes, declarations, and relationship-introduced symbols", () => {
    const document = analyzeLanguageDocument(`provider k8s
cluster prod {
  namespace web {
    app: deployment
    service -[targets]-> app
  }
}`);

    expect(document.providerId).toBe("k8s");
    expect(document.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "app",
          resourceKind: "deployment",
          scopePath: ["cluster:prod", "namespace:web"],
        }),
        expect.objectContaining({
          name: "service",
          resourceKind: "service",
          scopePath: ["cluster:prod", "namespace:web"],
        }),
      ]),
    );
  });

  it("retains tokens and symbols for incomplete source", () => {
    const document = analyzeLanguageDocument(
      "provider aws\napi: lambda\napi -[",
    );
    expect(document.tokens.at(-1)?.image).toBe("[");
    expect(document.symbols).toContainEqual(
      expect.objectContaining({ name: "api", resourceKind: "lambda" }),
    );
  });
});
