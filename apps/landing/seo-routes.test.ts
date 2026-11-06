import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogSize, publishedExamples } from "./src/data/examples";
import { providerPages, providerPath } from "./src/data/providers";
import { indexablePaths, sitemapXml } from "./src/data/routes";
import { providers } from "./src/data/site";

describe("landing SEO routes", () => {
  it("lists every provider page, the gallery and each example in the sitemap", () => {
    const xml = sitemapXml();
    const paths = indexablePaths();
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of [
      "/",
      "/aws-architecture-diagrams/",
      "/gcp-architecture-diagrams/",
      "/cloudflare-architecture-diagrams/",
      "/kubernetes-architecture-diagrams/",
      "/examples/",
    ]) {
      expect(xml).toContain(`<loc>https://archlex.dev${path}</loc>`);
    }
    for (const example of publishedExamples) {
      expect(xml).toContain(`<loc>https://archlex.dev${example.path}</loc>`);
    }
  });

  it("publishes at least three checked examples per provider", () => {
    for (const page of providerPages) {
      expect(
        publishedExamples.filter((item) => item.provider === page.provider)
          .length,
      ).toBeGreaterThanOrEqual(3);
    }
    for (const page of providerPages.filter((p) => p.featuredExampleId)) {
      expect(publishedExamples.map((item) => item.id)).toContain(
        page.featuredExampleId,
      );
    }
  });

  it("keeps provider copy in sync with the catalogs", () => {
    for (const page of providerPages) {
      expect(page.lede).toContain(String(catalogSize(page.provider)));
    }
    const llms = readFileSync("apps/landing/public/llms.txt", "utf8");
    expect(llms).toContain(`${catalogSize("aws")} AWS`);
    expect(llms).toContain(`${catalogSize("gcp")} GCP`);
    expect(llms).toContain(`${catalogSize("cloudflare")} Cloudflare`);
    expect(llms).toContain(`${catalogSize("k8s")} Kubernetes`);
    for (const page of providerPages) {
      expect(llms).toContain(`https://archlex.dev${providerPath(page)}`);
    }
  });

  it("links homepage provider rows to the provider pages", () => {
    expect(providers.map((provider) => provider.docs).sort()).toEqual(
      providerPages.map(providerPath).sort(),
    );
  });
});
