import Head from "next/head";
import { useConfig } from "nextra-theme-docs";
import type { ReactElement, ReactNode } from "react";

const SITE_ORIGIN = "https://docs.archlex.dev";
const SITE_NAME = "ArchLex Documentation";
const DEFAULT_DESCRIPTION =
  "Semantic cloud architecture diagramming library — compile text-based architecture definitions into accessible SVG diagrams for AWS, GCP, and Kubernetes.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-image.png`;

const prettySegment = (segment: string): string =>
  segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Derive the public route from the source file path (e.g. "guides/mcp-server.md").
// useRouter() cannot be used for this: tags must render through next/head,
// where the router is not mounted during static prerendering.
const routeFromFilePath = (filePath: string): string => {
  const segments = filePath
    .replace(/\.(md|mdx)$/, "")
    .split("/")
    .filter(Boolean);
  // The Nextra page map is rooted at the repo-level `pages/` directory
  if (segments[0] === "pages") {
    segments.shift();
  }
  if (segments.at(-1) === "index") {
    segments.pop();
  }
  return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
};

/**
 * Per-page SEO tags, rendered through next/head from inside Nextra's page
 * context (via the theme's `main` wrapper — the static `head` config renders
 * outside ConfigProvider and cannot see frontmatter).
 *
 * Providing a custom theme `head` also replaces nextra-theme-docs' default
 * frontmatter-driven tags entirely, so this component owns the full set:
 * title, description, canonical, Open Graph, Twitter cards, and JSON-LD.
 */
export function SeoHead(): ReactElement {
  const { frontMatter, title, filePath } = useConfig();
  const path = routeFromFilePath(filePath);
  const url = `${SITE_ORIGIN}${path}`;
  const description: string = frontMatter.description ?? DEFAULT_DESCRIPTION;
  const image: string = frontMatter.image ?? DEFAULT_IMAGE;
  const isHome = path === "/";
  const fullTitle = isHome ? SITE_NAME : `${title} – ${SITE_NAME}`;

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
          "@type": "ListItem",
          position: index + 2,
          name: prettySegment(segment),
          item: `${SITE_ORIGIN}/${segments.slice(0, index + 1).join("/")}/`,
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
          headline: title,
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

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={url} />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta
        key="og:description"
        property="og:description"
        content={description}
      />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta
        key="og:type"
        property="og:type"
        content={isHome ? "website" : "article"}
      />
      <meta key="og:image" property="og:image" content={image} />
      <meta
        key="twitter:card"
        name="twitter:card"
        content="summary_large_image"
      />
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      <meta
        key="twitter:description"
        name="twitter:description"
        content={description}
      />
      <meta key="twitter:image" name="twitter:image" content={image} />
      <script
        key="jsonld"
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inlined as-is
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}

/**
 * Theme `main` wrapper: mounts SeoHead inside Nextra's ConfigProvider so it
 * can read per-page frontmatter, then renders the page content unchanged.
 */
export function MainWithSeo({
  children,
}: { children: ReactNode }): ReactElement {
  return (
    <>
      <SeoHead />
      {children}
    </>
  );
}
