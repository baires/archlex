import { readRenderToken } from "./render-links.js";
import type { Env } from "./security.js";
import { parseRenderUrlConfig } from "./security.js";
import { renderDiagramPng } from "./tools/render.js";

const CORS_JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
} as const;

const INVALID_TOKEN_BODY = JSON.stringify({
  error: "Invalid or expired token",
});

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: CORS_JSON_HEADERS,
  });
}

export async function handleStatelessRenderRequest(
  request: Request,
  env?: Env,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonError(405, "Method not allowed");
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/renders\/([^.]+)\.png$/);

  if (!match) {
    return new Response(INVALID_TOKEN_BODY, {
      status: 400,
      headers: CORS_JSON_HEADERS,
    });
  }

  const token = match[1];
  const config = parseRenderUrlConfig(env);

  if (!config.secret) {
    return jsonError(503, "Render URL service not configured");
  }

  try {
    const now = Date.now();
    const payload = await readRenderToken(token, config.secret, now);

    const result = await renderDiagramPng({
      source: payload.source,
      theme: payload.theme,
      direction: payload.direction,
      validation: payload.validation,
    });

    if (result.hasErrors) {
      return new Response(INVALID_TOKEN_BODY, {
        status: 400,
        headers: CORS_JSON_HEADERS,
      });
    }

    const remainingMs = payload.expiresAt - now;
    const remainingSeconds = Math.max(1, Math.floor(remainingMs / 1000));
    const pngBuffer = result.pngBytes.slice(0);

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": `public, max-age=${remainingSeconds}, immutable`,
      },
    });
  } catch {
    return new Response(INVALID_TOKEN_BODY, {
      status: 400,
      headers: CORS_JSON_HEADERS,
    });
  }
}
