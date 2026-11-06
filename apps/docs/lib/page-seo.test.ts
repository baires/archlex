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

  test("leaves folder crumbs without a page out of the breadcrumb", () => {
    const seo = buildPageSeo(
      { title: "AWS Semantics" },
      ["specs", "aws-semantics"],
      new Set(["/", "/specs/aws-semantics/"]),
    );
    const breadcrumb = seo.jsonLd.find(
      (item) => item["@type"] === "BreadcrumbList",
    ) as { itemListElement: { name: string; item: string }[] };

    expect(breadcrumb.itemListElement).toEqual([
      expect.objectContaining({
        position: 1,
        item: "https://docs.archlex.dev/",
      }),
      expect.objectContaining({
        position: 2,
        name: "AWS Semantics",
        item: "https://docs.archlex.dev/specs/aws-semantics/",
      }),
    ]);
  });
});
