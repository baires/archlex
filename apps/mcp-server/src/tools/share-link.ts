export const DEFAULT_SHARE_ORIGIN = "https://share.archlex.dev";
export const DEFAULT_PLAYGROUND_ORIGIN = "https://playground.archlex.dev";

export interface ShareLinks {
  id: string;
  playgroundUrl: string;
  svgUrl: string;
  pngUrl: string;
  revokeToken?: string;
}

export interface ShareClientConfig {
  origin: string;
  token?: string;
  clientAddress?: string;
  fetch?: typeof fetch;
}

export type ShareStatus = "created" | "unavailable";

export function sourceEncodedPlaygroundUrl(
  source: string,
  configuredOrigin?: string,
): string {
  let origin = DEFAULT_PLAYGROUND_ORIGIN;
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      const isLocalHttp =
        url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1");
      if (
        (url.protocol === "https:" || isLocalHttp) &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      ) {
        origin = url.origin;
      }
    } catch {
      // Invalid deployment configuration falls back to the public playground.
    }
  }
  return `${origin}/?code=${encodeURIComponent(source)}`;
}

export function shareConfigFromEnv(
  env?: {
    SHARE_ORIGIN?: string;
    SHARE_SERVICE_TOKEN?: string;
  },
  request?: Request,
): ShareClientConfig | undefined {
  const origin = env?.SHARE_ORIGIN?.trim();
  if (!origin) return undefined;
  const clientAddress = request?.headers.get("cf-connecting-ip")?.trim();
  return {
    origin,
    token: env?.SHARE_SERVICE_TOKEN,
    ...(clientAddress ? { clientAddress } : {}),
  };
}

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function parseShareOrigin(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    if (url.protocol === "https:") return url;
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.port === "8787"
    ) {
      return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function isExpectedShareUrl(
  value: unknown,
  origin: URL,
  expectedPath: string,
): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      url.origin === origin.origin &&
      url.pathname === expectedPath &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

async function hashClientAddress(address: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address)),
  );
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function createShareLinks(
  source: string,
  config: ShareClientConfig,
): Promise<ShareLinks | undefined> {
  const origin = config.origin.replace(/\/$/, "");
  const parsedOrigin = parseShareOrigin(origin);
  if (!parsedOrigin) return undefined;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (config.token) {
    headers.authorization = `Bearer ${config.token}`;
    if (config.clientAddress) {
      headers["x-archlex-client"] = await hashClientAddress(
        config.clientAddress,
      );
    }
  }
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
      !SHARE_ID_PATTERN.test(body.id) ||
      !isExpectedShareUrl(body.playgroundUrl, parsedOrigin, `/s/${body.id}`) ||
      !isExpectedShareUrl(body.svgUrl, parsedOrigin, `/s/${body.id}.svg`) ||
      !isExpectedShareUrl(body.pngUrl, parsedOrigin, `/s/${body.id}.png`)
    ) {
      return undefined;
    }
    return {
      id: body.id,
      playgroundUrl: body.playgroundUrl,
      svgUrl: body.svgUrl,
      pngUrl: body.pngUrl,
      ...(typeof body.revokeToken === "string"
        ? { revokeToken: body.revokeToken }
        : {}),
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
