import { readFileSync } from "node:fs";
import {
  awsProvider,
  cloudflareProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { describe, expect, it } from "vitest";
import { catalogSize, publishedExamples } from "./src/data/examples";
import { providerPages, providerPath } from "./src/data/providers";
import { indexablePaths, sitemapXml } from "./src/data/routes";
import { servicePages, servicePath } from "./src/data/services";
import { providers } from "./src/data/site";

const engine = createArchLex({
  providers: [
    awsProvider(),
    cloudflareProvider(),
    gcpProvider(),
    k8sProvider(),
  ],
});

describe("landing SEO routes", () => {
  it("lists every provider page, service page, the gallery and each example in the sitemap", () => {
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
      "/aws/lambda-architecture-diagram/",
      "/gcp/cloud-run-architecture-diagram/",
      "/cloudflare/workers-architecture-diagram/",
      "/kubernetes/ingress-architecture-diagram/",
    ]) {
      expect(xml).toContain(`<loc>https://archlex.dev${path}</loc>`);
    }
    for (const example of publishedExamples) {
      expect(xml).toContain(`<loc>https://archlex.dev${example.path}</loc>`);
    }
    for (const page of servicePages) {
      expect(xml).toContain(
        `<loc>https://archlex.dev${servicePath(page)}</loc>`,
      );
    }
  });

  it("publishes a useful batch of per-service pages", () => {
    expect(servicePages.length).toBeGreaterThanOrEqual(10);
    expect(new Set(servicePages.map((page) => page.id)).size).toBe(
      servicePages.length,
    );
    for (const page of servicePages) {
      expect(page.snippets.length).toBeGreaterThanOrEqual(1);
      expect(page.faqs.length).toBeGreaterThanOrEqual(3);
      expect(page.h1.toLowerCase()).toContain("architecture diagram");
      expect(servicePath(page)).toBe(
        `/${providerPages.find((item) => item.provider === page.provider)!.slug}/${page.slug}-architecture-diagram/`,
      );
    }
  });

  it("keeps every service snippet free of provider warnings", () => {
    for (const page of servicePages) {
      for (const snippet of page.snippets) {
        const prepared = engine.prepare(snippet.source);
        const bad = prepared.diagnostics.filter(
          (item) => item.severity !== "info",
        );
        expect(bad, `${page.id}/${snippet.file}`).toEqual([]);
      }
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
    for (const page of servicePages) {
      expect(llms).toContain(`https://archlex.dev${servicePath(page)}`);
    }
  });

  it("links homepage provider rows to the provider pages", () => {
    expect(providers.map((provider) => provider.docs).sort()).toEqual(
      providerPages.map(providerPath).sort(),
    );
  });
});
