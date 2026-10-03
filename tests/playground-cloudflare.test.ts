import { readFileSync } from "node:fs";
import { cloudflareProvider, createArchLex } from "@archlex/core";
import { describe, expect, it, vi } from "vitest";
import {
  analyzeLanguageDocument,
  createCompletionEngine,
} from "../packages/language-service/src/index.js";

const appSource = readFileSync(
  new URL("../apps/playground/src/App.tsx", import.meta.url),
  "utf8",
);

describe("Cloudflare playground authoring", () => {
  it("registers Cloudflare in the app engine without a CDN provider", () => {
    expect(appSource).toContain("cloudflareProvider()");
    expect(appSource).not.toContain("CLOUDFLARE_CDN");
    expect(
      readFileSync(
        new URL("../apps/playground/src/icon-loader.ts", import.meta.url),
        "utf8",
      ),
    ).not.toContain("cloudflare");
  });

  it("offers Workers completions and renders the selected resource offline", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const archlex = createArchLex({
      providers: [cloudflareProvider()],
    });
    const catalog = archlex.getCatalog();
    const completions = createCompletionEngine(catalog).complete(
      analyzeLanguageDocument("provider cloudflare\napi: work"),
      "provider cloudflare\napi: work".length,
      { trigger: "manual" },
    );

    expect(catalog.directives.provider).toContain("cloudflare");
    expect(completions.map((item) => item.insertText)).toEqual(
      expect.arrayContaining(["workers"]),
    );
    const qualifiedSource = "api: work";
    const qualified = createCompletionEngine(catalog).complete(
      analyzeLanguageDocument(qualifiedSource),
      qualifiedSource.length,
      { trigger: "manual" },
    );
    expect(qualified.map((item) => item.insertText)).toContain(
      "cloudflare.workers",
    );
    const rendered = await archlex.render(
      'provider cloudflare\napi: workers["API"]',
    );
    expect(
      rendered.diagnostics.map((diagnostic) => diagnostic.code),
    ).not.toContain("AL-SEM-UNKNOWN-RESOURCE");
    expect(rendered.svg).toContain("API (Workers)");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
