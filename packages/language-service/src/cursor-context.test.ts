import { describe, expect, it } from "vitest";
import { getCursorContext } from "./cursor-context.js";
import { analyzeLanguageDocument } from "./document.js";

describe("getCursorContext", () => {
  it("detects resource-declaration position after colon", () => {
    const document = analyzeLanguageDocument("provider aws\napi: ");
    const context = getCursorContext(document, document.source.length);

    expect(context.position).toBe("resource-kind");
    expect(context.providerId).toBe("aws");
    expect(context.scopePath).toEqual([]);
  });

  it("detects resource-declaration position inside a scope", () => {
    const document = analyzeLanguageDocument(
      "provider k8s\ncluster prod {\n  app: ",
    );
    const context = getCursorContext(document, document.source.length);

    expect(context.position).toBe("resource-kind");
    expect(context.providerId).toBe("k8s");
    expect(context.scopePath).toEqual(["cluster:prod"]);
  });

  it("detects scope position for directive line", () => {
    const document = analyzeLanguageDocument("provider ");
    const context = getCursorContext(document, document.source.length);

    expect(context.position).toBe("directive-value");
    expect(context.directiveName).toBe("provider");
  });

  it("handles incomplete relationship gracefully", () => {
    const document = analyzeLanguageDocument("provider aws\napi -[");
    const context = getCursorContext(document, document.source.length);

    // After opening bracket in relationship, we're in relationship-kind position
    expect(context.position).toBe("relationship-kind");
  });

  it("detects statement-start at beginning of line", () => {
    const document = analyzeLanguageDocument("provider aws\n");
    const context = getCursorContext(document, document.source.length);

    expect(context.position).toBe("statement-start");
  });
});
