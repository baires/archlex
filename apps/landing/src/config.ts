export const SITE_ROUTES = {
  docs: "https://docs.archlex.dev",
  playground: "https://playground.archlex.dev",
  github: import.meta.env.PUBLIC_GITHUB_URL?.trim() || null,
} as const;
