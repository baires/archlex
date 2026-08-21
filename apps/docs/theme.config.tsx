import React from "react";
import { MainWithSeo } from "./components/seo-head";

const config = {
  logo: <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>ArchLex</span>,
  project: {
    link: "https://github.com/baires/archlex",
  },
  docsRepositoryBase: "https://github.com/baires/archlex/tree/main/apps/docs",
  // Static tags only — per-page SEO (title, description, canonical, Open
  // Graph, JSON-LD) is emitted by MainWithSeo via the `main` wrapper, because
  // this static `head` renders outside Nextra's page ConfigProvider.
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=1" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=1" />
    </>
  ),
  main: MainWithSeo,
  footer: {
    content: (
      <span>
        {new Date().getFullYear()} ©{" "}
        <a href="https://archlex.dev" target="_blank" rel="noopener noreferrer">
          ArchLex
        </a>
        .
      </span>
    ),
  },
};

export default config;
