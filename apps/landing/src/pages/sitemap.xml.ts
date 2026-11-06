import type { APIRoute } from "astro";
import { sitemapXml } from "../data/routes";

export const GET: APIRoute = () =>
  new Response(sitemapXml(), {
    headers: { "Content-Type": "application/xml" },
  });
