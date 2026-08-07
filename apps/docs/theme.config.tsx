import React from "react";

const config = {
  logo: <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>ArchLex</span>,
  project: {
    link: "https://github.com/baires/archlex",
  },
  docsRepositoryBase: "https://github.com/baires/archlex/tree/main/apps/docs",
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="ArchLex Documentation" />
      <meta
        property="og:description"
        content="Semantic cloud architecture diagramming library"
      />
    </>
  ),
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
