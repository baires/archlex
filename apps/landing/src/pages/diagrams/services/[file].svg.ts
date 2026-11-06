import type { APIRoute, GetStaticPaths } from "astro";
import { renderServiceSnippet, servicePages } from "../../../data/services";

export const getStaticPaths = (() =>
  servicePages.flatMap((page) =>
    page.snippets.flatMap((_, index) =>
      (["light", "dark"] as const).map((theme) => ({
        params: { file: `${page.id}-${index}-${theme}` },
        props: { source: page.snippets[index].source, theme },
      })),
    ),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { svg } = await renderServiceSnippet(
    props.source as string,
    props.theme as "light" | "dark",
  );
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
};
