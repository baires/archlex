import { publishedExamples } from "./examples";
import { providerPages, providerPath } from "./providers";
import { SITE_ORIGIN } from "./seo";

/** Every indexable landing route, used to generate sitemap.xml. */
export function indexablePaths(): string[] {
  return [
    "/",
    ...providerPages.map(providerPath),
    "/examples/",
    ...publishedExamples.map((example) => example.path),
  ];
}

export function sitemapXml(): string {
  const urls = indexablePaths()
    .map((path) => `  <url>\n    <loc>${SITE_ORIGIN}${path}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
