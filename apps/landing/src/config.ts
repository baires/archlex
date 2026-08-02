export const SITE_ROUTES = {
  docs: "/docs",
  playground: "/playground",
  github: import.meta.env.PUBLIC_GITHUB_URL?.trim() || null,
} as const;
