import type { APIRoute, GetStaticPaths } from "astro";
import { publishedExamples, renderExample } from "../../../data/examples";

export const getStaticPaths = (() =>
  publishedExamples.flatMap((example) =>
    (["light", "dark"] as const).map((theme) => ({
      params: { file: `${example.id}-${theme}` },
      props: { source: example.source, theme },
    })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { svg } = await renderExample(
    props.source as string,
    props.theme as "light" | "dark",
  );
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
};
