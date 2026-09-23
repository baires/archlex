import type { ShareLinks } from "./share-link.js";

export interface GeneratePlaygroundUrlArgs {
  source: string;
}

export async function handleGeneratePlaygroundUrl(
  args: GeneratePlaygroundUrlArgs,
  options?: {
    createShare?: (source: string) => Promise<ShareLinks | undefined>;
  },
) {
  const { source } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  const share = await options?.createShare?.(source);
  const encodedSource = encodeURIComponent(source);
  const playgroundUrl =
    share?.playgroundUrl ??
    `https://playground.archlex.dev/?code=${encodedSource}`;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            url: playgroundUrl,
            ...(share ? { svg_url: share.svgUrl, png_url: share.pngUrl } : {}),
          },
          null,
          2,
        ),
      },
    ],
  };
}
