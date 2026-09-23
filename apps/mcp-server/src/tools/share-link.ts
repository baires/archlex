export const DEFAULT_SHARE_ORIGIN = "https://share.archlex.dev";

export interface ShareLinks {
  id: string;
  playgroundUrl: string;
  svgUrl: string;
  pngUrl: string;
}

export interface ShareClientConfig {
  origin: string;
  token?: string;
  fetch?: typeof fetch;
}

export function shareConfigFromEnv(env?: {
  SHARE_ORIGIN?: string;
  SHARE_SERVICE_TOKEN?: string;
}): ShareClientConfig | undefined {
  const origin = env?.SHARE_ORIGIN?.trim();
  if (!origin) return undefined;
  return { origin, token: env?.SHARE_SERVICE_TOKEN };
}

export async function createShareLinks(
  source: string,
  config: ShareClientConfig,
): Promise<ShareLinks | undefined> {
  const origin = config.origin.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (config.token) headers.authorization = `Bearer ${config.token}`;
  try {
    const response = await (config.fetch ?? fetch)(`${origin}/v1/shares`, {
      method: "POST",
      headers,
      body: JSON.stringify({ source }),
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as Partial<ShareLinks>;
    if (
      typeof body.id !== "string" ||
      typeof body.playgroundUrl !== "string" ||
      typeof body.svgUrl !== "string" ||
      typeof body.pngUrl !== "string"
    ) {
      return undefined;
    }
    return {
      id: body.id,
      playgroundUrl: body.playgroundUrl,
      svgUrl: body.svgUrl,
      pngUrl: body.pngUrl,
    };
  } catch {
    return undefined;
  }
}

export function sharePreviewText(
  alt: string,
  imageUrl: string,
  playgroundUrl: string,
): string {
  return `![${alt}](${imageUrl})\n\n${playgroundUrl}`;
}
