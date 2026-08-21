/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: "https://docs.archlex.dev",
  outDir: "out",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: "weekly",
  priority: 0.7,
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/" }],
  },
};

export default config;
