import { readRenderToken } from "./render-links.js";
import { createRequestAbortScope, waitWithSignal } from "./request-limits.js";
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

// Per-isolate limit includes work still settling after its client has disconnected.
let activeRenders = 0;
const MAX_CONCURRENT_RENDERS = 4;

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

  const scope = createRequestAbortScope(request.signal, env);
  try {
    scope.signal.throwIfAborted();
    const now = Date.now();
    const payload = await waitWithSignal(
      readRenderToken(token, config.secret, now),
      scope.signal,
    );
    scope.signal.throwIfAborted();
    if (activeRenders >= MAX_CONCURRENT_RENDERS) {
      return new Response(
        JSON.stringify({ error: "Too many active renders" }),
        {
          status: 503,
          headers: { ...CORS_JSON_HEADERS, "Retry-After": "5" },
        },
      );
    }

    activeRenders++;
    const rendering = renderDiagramPng(
      {
        source: payload.source,
        theme: payload.theme,
        direction: payload.direction,
        validation: payload.validation,
      },
      { signal: scope.signal },
    ).finally(() => {
      activeRenders--;
    });
    const result = await waitWithSignal(rendering, scope.signal);
    scope.signal.throwIfAborted();

    if (result.hasErrors) {
      return new Response(INVALID_TOKEN_BODY, {
        status: 400,
        headers: CORS_JSON_HEADERS,
      });
    }

    const remainingMs = payload.expiresAt - Date.now();
    if (remainingMs <= 0)
      return new Response(INVALID_TOKEN_BODY, {
        status: 400,
        headers: CORS_JSON_HEADERS,
      });
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
    if (scope.signal.aborted) {
      const timedOut =
        scope.signal.reason instanceof DOMException &&
        scope.signal.reason.name === "TimeoutError";
      return jsonError(
        timedOut ? 504 : 408,
        timedOut ? "Render deadline exceeded" : "Render request canceled",
      );
    }
    return new Response(INVALID_TOKEN_BODY, {
      status: 400,
      headers: CORS_JSON_HEADERS,
    });
  } finally {
    scope.cleanup();
  }
}
