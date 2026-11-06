import type { Metadata } from "next";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import type { ReactElement, ReactNode } from "react";
import "@archlex/design";
import "nextra-theme-docs/style.css";
import "../styles/nextra-overrides.css";

const SITE_NAME = "ArchLex Documentation";
const DEFAULT_DESCRIPTION =
  "Semantic cloud architecture diagramming library — compile text-based architecture definitions into accessible SVG diagrams for AWS, Cloudflare, GCP, and Kubernetes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.archlex.dev"),
  title: {
    default: SITE_NAME,
    template: `%s – ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
};

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 700, fontSize: "1.25rem" }}>ArchLex</span>}
    projectLink="https://github.com/baires/archlex"
  />
);

const DIAGRAM_PAGES = [
  ["AWS", "https://archlex.dev/aws-architecture-diagrams/"],
  ["Google Cloud", "https://archlex.dev/gcp-architecture-diagrams/"],
  ["Cloudflare", "https://archlex.dev/cloudflare-architecture-diagrams/"],
  ["Kubernetes", "https://archlex.dev/kubernetes-architecture-diagrams/"],
  ["Examples", "https://archlex.dev/examples/"],
] as const;

const footer = (
  <Footer>
    <div>
      <nav aria-label="Architecture diagrams">
        {DIAGRAM_PAGES.map(([label, href], index) => (
          <span key={href}>
            {index > 0 && " · "}
            <a href={href}>
              {label === "Examples"
                ? "Architecture diagram examples"
                : `${label} diagrams`}
            </a>
          </span>
        ))}
      </nav>
      <p>
        {new Date().getFullYear()} © <a href="https://archlex.dev">ArchLex</a>.
      </p>
    </div>
  </Footer>
);

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 94, saturation: 100 }}>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=1" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=1" />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          docsRepositoryBase="https://github.com/baires/archlex/tree/main/apps/docs"
          editLink="Edit this page on GitHub"
          pageMap={await getPageMap()}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
