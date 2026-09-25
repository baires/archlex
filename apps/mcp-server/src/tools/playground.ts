import { type ShareLinks, sourceEncodedPlaygroundUrl } from "./share-link.js";

export interface GeneratePlaygroundUrlArgs {
  source: string;
}

export async function handleGeneratePlaygroundUrl(
  args: GeneratePlaygroundUrlArgs,
  options?: {
    createShare?: (source: string) => Promise<ShareLinks | undefined>;
    playgroundOrigin?: string;
  },
) {
  const { source } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  const share = await options?.createShare?.(source);
  const playgroundUrl =
    share?.playgroundUrl ??
    sourceEncodedPlaygroundUrl(source, options?.playgroundOrigin);
  const shareStatus = share ? "created" : "unavailable";

  const structuredContent = {
    url: playgroundUrl,
    share_status: shareStatus,
    ...(share ? { svg_url: share.svgUrl, png_url: share.pngUrl } : {}),
    ...(share?.revokeToken ? { revoke_token: share.revokeToken } : {}),
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            url: playgroundUrl,
            share_status: shareStatus,
            ...(share ? { svg_url: share.svgUrl, png_url: share.pngUrl } : {}),
          },
          null,
          2,
        ),
      },
    ],
    structuredContent,
  };
}
