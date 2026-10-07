import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const landingPublicDir = "apps/landing/public";

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return relative(landingPublicDir, fullPath).replaceAll("\\", "/");
  });
}

describe("landing static assets", () => {
  it("ships only public files referenced by the landing page", () => {
    expect(listFiles(landingPublicDir).sort()).toEqual([
      "apple-touch-icon-precomposed.png",
      "apple-touch-icon.png",
      "archlex-event-pipeline-dark.png",
      "diagrams/aws-3-tier-dark.svg",
      "diagrams/aws-3-tier-light.svg",
      "diagrams/hero-dark.svg",
      "diagrams/hero-light.svg",
      "diagrams/serverless-api-dark.svg",
      "diagrams/serverless-api-light.svg",
      "favicon.svg",
      "robots.txt",
      "sitemap.xml",
    ]);
  });

  it("keeps hero diagram SVGs optimized instead of replacing them with heavier raster assets", () => {
    for (const theme of ["dark", "light"]) {
      const svg = readFileSync(
        `${landingPublicDir}/diagrams/hero-${theme}.svg`,
        "utf8",
      );

      expect(Buffer.byteLength(svg)).toBeLessThan(55_000);
      expect(svg).toContain('role="graphics-document"');
      expect(svg).toContain("aria-label=");
    }
  });

  it("ships robots.txt and a sitemap so crawlers get real files", () => {
    const robots = readFileSync(`${landingPublicDir}/robots.txt`, "utf8");
    const sitemap = readFileSync(`${landingPublicDir}/sitemap.xml`, "utf8");

    expect(robots).toContain("Sitemap: https://archlex.dev/sitemap.xml");
    expect(sitemap).toContain("<loc>https://archlex.dev/</loc>");
    expect(sitemap).toContain(
      "<loc>https://archlex.dev/aws-architecture-diagrams/</loc>",
    );
  });

  it("uses woff2-only local font sources to avoid emitting duplicate legacy font files", () => {
    const fontsCss = readFileSync("packages/design/fonts.css", "utf8");

    expect(fontsCss).toContain("commit-mono-latin-400-normal.woff2");
    expect(fontsCss).toContain("commit-mono-latin-500-normal.woff2");
    expect(fontsCss).not.toContain("@fontsource/commit-mono/400.css");
    expect(fontsCss).not.toContain("@fontsource/commit-mono/500.css");
    expect(fontsCss).not.toMatch(/\.woff["')]/);
  });
});
