import { describe, expect, test } from "vitest";
import { buildPageSeo } from "./page-seo";

describe("buildPageSeo", () => {
  test("uses the public route, including the docs home", () => {
    const home = buildPageSeo({ title: "Documentation", description: "Home" });
    const guide = buildPageSeo(
      { title: "Use with AI agents", description: "Agents" },
      ["guides", "agents"],
    );

    expect(home.metadata.alternates?.canonical).toBe(
      "https://docs.archlex.dev/",
    );
    expect(guide.metadata.alternates?.canonical).toBe(
      "https://docs.archlex.dev/guides/agents/",
    );
    expect(guide.metadata.title).toEqual({
      absolute: "Use with AI agents – ArchLex Documentation",
    });
  });
});
