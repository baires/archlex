export const DEFAULT_SHARE_ORIGIN = "https://share.archlex.dev";

export function shareRequestOrigin(
  configured: string,
  pageOrigin: string,
): string {
  if (
    pageOrigin.startsWith("http://localhost:") ||
    pageOrigin.startsWith("http://127.0.0.1:") ||
    pageOrigin.startsWith("http://[::1]:")
  ) {
    return pageOrigin;
  }
  return configured || DEFAULT_SHARE_ORIGIN;
}

export function configuredShareOrigin(
  configured = import.meta.env.VITE_SHARE_ORIGIN,
  dev = import.meta.env.DEV,
): string {
  const trimmed = configured?.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  return dev ? "" : DEFAULT_SHARE_ORIGIN;
}

export function shareClipboardText(
  svgUrl: string,
  playgroundUrl: string,
): string {
  return `![Architecture diagram](${svgUrl})\n\n${playgroundUrl}`;
}

export function shareFailureMessage(status: number, _body: string): string {
  if (status === 413) return "Diagram is too large to share";
  if (status === 429) return "Too many shares. Try again later";
  if (status === 503) return "Share is temporarily unavailable";
  return "Could not share diagram";
}

export function sourceAfterShareFailure(
  persisted: string | null,
  fallback: string,
): string {
  return persisted?.trim() ? persisted : fallback;
}

function invokeFetch(
  fetchFn: typeof fetch,
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return init
    ? fetchFn.call(globalThis, input, init)
    : fetchFn.call(globalThis, input);
}

type ShareResult =
  | { ok: true; source: string }
  | { ok: false; message: string };

export async function loadSharedSource(
  id: string,
  fetchFn: typeof fetch,
  origin = DEFAULT_SHARE_ORIGIN,
): Promise<ShareResult> {
  try {
    const response = await invokeFetch(fetchFn, `${origin}/v1/shares/${id}`);
    if (!response.ok) {
      return {
        ok: false,
        message:
          response.status === 404
            ? "Share link expired or missing"
            : "Could not load share",
      };
    }
    const body = (await response.json()) as { source?: unknown };
    if (typeof body.source !== "string" || body.source.length === 0) {
      return { ok: false, message: "Could not load share" };
    }
    return { ok: true, source: body.source };
  } catch {
    return { ok: false, message: "Could not load share" };
  }
}

export interface ShareClient {
  fetch: typeof fetch;
  origin?: string;
}

export type ShareDiagramResult =
  | {
      ok: true;
      id: string;
      playgroundUrl: string;
      svgUrl: string;
      revokeToken?: string;
    }
  | { ok: false; message: string };

function isExpectedShareUrl(
  value: unknown,
  origin: string,
  expectedPath: string,
): value is string {
  if (typeof value !== "string") return false;
  try {
    const base = new URL(origin);
    const url = new URL(value);
    const isLocalOrigin =
      base.protocol === "http:" &&
      base.port === "8787" &&
      (base.hostname === "localhost" || base.hostname === "127.0.0.1");
    return (
      (base.protocol === "https:" || isLocalOrigin) &&
      !base.username &&
      !base.password &&
      base.pathname === "/" &&
      !base.search &&
      !base.hash &&
      !url.username &&
      !url.password &&
      url.origin === base.origin &&
      url.pathname === expectedPath &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export async function shareDiagram(
  source: string,
  client: ShareClient,
): Promise<ShareDiagramResult> {
  const origin = client.origin ?? DEFAULT_SHARE_ORIGIN;
  try {
    const response = await invokeFetch(client.fetch, `${origin}/v1/shares`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (!response.ok) {
      const body = await response.text();
      const message = shareFailureMessage(response.status, body);
      return {
        ok: false,
        message:
          response.status === 413 ||
          response.status === 429 ||
          response.status === 503
            ? message
            : `${message} (${response.status})`,
      };
    }
    const payload = (await response.json()) as {
      id?: unknown;
      svgUrl?: unknown;
      playgroundUrl?: unknown;
      revokeToken?: unknown;
    };
    if (
      typeof payload.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(payload.id) ||
      !isExpectedShareUrl(payload.svgUrl, origin, `/s/${payload.id}.svg`) ||
      !isExpectedShareUrl(payload.playgroundUrl, origin, `/s/${payload.id}`)
    ) {
      return { ok: false, message: "Could not share diagram" };
    }
    return {
      ok: true,
      id: payload.id,
      playgroundUrl: payload.playgroundUrl,
      svgUrl: payload.svgUrl,
      ...(typeof payload.revokeToken === "string"
        ? { revokeToken: payload.revokeToken }
        : {}),
    };
  } catch {
    return { ok: false, message: "Could not reach the share service" };
  }
}

export async function revokeSharedDiagram(
  id: string,
  revokeToken: string,
  client: ShareClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const origin = client.origin ?? DEFAULT_SHARE_ORIGIN;
  try {
    const response = await invokeFetch(
      client.fetch,
      `${origin}/v1/shares/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${revokeToken}`,
        },
      },
    );
    if (response.status === 204) {
      return { ok: true };
    }
    return { ok: false, message: "Could not revoke share" };
  } catch {
    return { ok: false, message: "Could not reach the share service" };
  }
}
