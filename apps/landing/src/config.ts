export const SITE_ROUTES = {
  docs: "https://docs.archlex.dev",
  agentsDocs: "https://docs.archlex.dev/guides/agents",
  mcpDocs: "https://docs.archlex.dev/guides/mcp-server",
  playground: "https://playground.archlex.dev",
  github:
    import.meta.env.PUBLIC_GITHUB_URL?.trim() ||
    "https://github.com/baires/archlex",
} as const;
