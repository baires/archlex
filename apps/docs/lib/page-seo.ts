import type { Metadata } from "next";

const SITE_ORIGIN = "https://docs.archlex.dev";
const SITE_NAME = "ArchLex Documentation";
const DEFAULT_DESCRIPTION =
  "Semantic cloud architecture diagramming library — compile text-based architecture definitions into accessible SVG diagrams for AWS, Cloudflare, GCP, and Kubernetes.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export type DocsPageMetadata = {
  title: string;
  description?: string | null;
  image?: unknown;
};

export type PageSeo = {
  metadata: Metadata;
  jsonLd: Record<string, unknown>[];
};

const prettySegment = (segment: string): string =>
  segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const routeFromSegments = (mdxPath?: string[]): string => {
  if (!mdxPath || mdxPath.length === 0) return "/";
  return `/${mdxPath.join("/")}/`;
};

export function buildPageSeo(
  page: DocsPageMetadata,
  mdxPath?: string[],
  /** Published routes; folder crumbs without a page are left out. */
  routes?: ReadonlySet<string>,
): PageSeo {
  const path = routeFromSegments(mdxPath);
  const url = `${SITE_ORIGIN}${path}`;
  const description = page.description || DEFAULT_DESCRIPTION;
  const image = typeof page.image === "string" ? page.image : DEFAULT_IMAGE;
  const isHome = path === "/";
  const fullTitle = isHome ? SITE_NAME : `${page.title} – ${SITE_NAME}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Docs",
        item: `${SITE_ORIGIN}/`,
      },
      ...path
        .split("/")
        .filter(Boolean)
        .map((segment, index, segments) => ({
          segment,
          route: `/${segments.slice(0, index + 1).join("/")}/`,
          last: index === segments.length - 1,
        }))
        .filter(({ route, last }) => last || !routes || routes.has(route))
        .map(({ segment, route, last }, index) => ({
          "@type": "ListItem",
          position: index + 2,
          name: last ? page.title : prettySegment(segment),
          item: `${SITE_ORIGIN}${route}`,
        })),
    ],
  };

  const jsonLd: Record<string, unknown>[] = isHome
    ? [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: `${SITE_ORIGIN}/`,
          description: DEFAULT_DESCRIPTION,
        },
        {
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: "ArchLex",
          description: DEFAULT_DESCRIPTION,
          codeRepository: "https://github.com/baires/archlex",
          programmingLanguage: "TypeScript",
          license: "https://github.com/baires/archlex/blob/main/LICENSE",
        },
      ]
    : [
        {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: page.title,
          description,
          url,
          image,
          inLanguage: "en",
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: `${SITE_ORIGIN}/`,
          },
        },
        breadcrumb,
      ];

  return {
    metadata: {
      title: { absolute: fullTitle },
      description,
      alternates: { canonical: url },
      openGraph: {
        title: fullTitle,
        description,
        url,
        siteName: SITE_NAME,
        type: isHome ? "website" : "article",
        images: [image],
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description,
        images: [image],
      },
    },
    jsonLd,
  };
}
