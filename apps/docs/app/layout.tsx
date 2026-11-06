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

const footer = (
  <Footer>
    {new Date().getFullYear()} ©{" "}
    <a href="https://archlex.dev" target="_blank" rel="noopener noreferrer">
      ArchLex
    </a>
    .
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
