import {
  consumeDailyPostBudget,
  consumePostLimit,
  findActiveShare,
  saveShareBySource,
} from "./d1.js";
import {
  DEFAULT_PLAYGROUND_ORIGIN,
  DEFAULT_SHARE_ORIGIN,
  type ShareEnv,
} from "./env.js";
import { errorResponse } from "./errors.js";
import {
  acquireRenderSlot,
  rasterizeDiagramSvg,
  releaseRenderSlot,
  renderDiagramSvg,
} from "./render.js";
import { sanitizeDiagramSvg } from "./sanitize-svg.js";
import {
  SOURCE_MAX_CHARS,
  clientIp,
  corsHeaders,
  createShareId,
  hashShareSource,
  isServiceClient,
  isShareId,
  parseShareSource,
  shareTtlMs,
} from "./security.js";

const MAX_BODY_BYTES = SOURCE_MAX_CHARS * 4;

function configuredOrigin(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim().replace(/\/$/, "");
  return trimmed ? trimmed : fallback;
}

function json(body: unknown, status: number, headers: Headers): Response {
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

type RateLimitResult = "allowed" | "limited" | "unavailable";

async function checkRateLimit(
  binding: ShareEnv["SHARE_POST_LIMITER"],
  key: string,
): Promise<RateLimitResult> {
  if (!binding) return "unavailable";
  try {
    return (await binding.limit({ key })).success ? "allowed" : "limited";
  } catch {
    return "unavailable";
  }
}

async function readJson(
  request: Request,
): Promise<unknown | "too_large" | "invalid"> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return "too_large";
  }
  const reader = request.body?.getReader();
  if (!reader) return "invalid";
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The request may already be disconnected; the size limit still applies.
        }
        return "too_large";
      }
      chunks.push(value);
    }
  } catch {
    return "invalid";
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return "invalid";
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return "invalid";
  }
}

export async function handleShareRequest(
  request: Request,
  env: ShareEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const playgroundOrigin = configuredOrigin(
    env.PLAYGROUND_ORIGIN,
    DEFAULT_PLAYGROUND_ORIGIN,
  );
  const shareOrigin = configuredOrigin(env.SHARE_ORIGIN, DEFAULT_SHARE_ORIGIN);
  const cors = corsHeaders(request.headers.get("origin"), playgroundOrigin);

  if (
    request.method === "OPTIONS" &&
    (path === "/v1/shares" || /^\/v1\/shares\/[^/]+$/.test(path))
  ) {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === "POST" && path === "/v1/shares") {
    return createShare(request, env, shareOrigin, cors);
  }

  const sourceMatch = path.match(/^\/v1\/shares\/([^/]+)$/);
  if (request.method === "GET" && sourceMatch?.[1]) {
    return readShare(sourceMatch[1], env, cors);
  }

  const imageMatch = path.match(/^\/s\/([^/]+)\.(svg|png)$/);
  if (request.method === "GET" && imageMatch?.[1] && imageMatch[2]) {
    return renderImage(
      imageMatch[1],
      imageMatch[2] === "png" ? "png" : "svg",
      request,
      env,
    );
  }

  const redirectMatch = path.match(/^\/s\/([^/]+)$/);
  if (request.method === "GET" && redirectMatch?.[1]) {
    return redirectShare(redirectMatch[1], playgroundOrigin);
  }

  return errorResponse(404, "not_found");
}

async function createShare(
  request: Request,
  env: ShareEnv,
  shareOrigin: string,
  cors: Headers,
): Promise<Response> {
  if (!env.DB) return errorResponse(503, "unavailable", cors);
  let service: boolean;
  try {
    service = await isServiceClient(request, env.SHARE_SERVICE_TOKEN);
  } catch {
    return errorResponse(503, "unavailable", cors);
  }
  const edgeLimit = await checkRateLimit(
    env.SHARE_POST_LIMITER,
    service ? "service:mcp" : clientIp(request),
  );
  if (edgeLimit === "unavailable")
    return errorResponse(503, "unavailable", cors);
  if (edgeLimit === "limited") return errorResponse(429, "rate_limited", cors);

  const body = await readJson(request);
  if (body === "too_large")
    return errorResponse(413, "payload_too_large", cors);
  if (body === "invalid") return errorResponse(400, "invalid_request", cors);
  const parsed = parseShareSource(body);
  if (!parsed.ok) return errorResponse(parsed.status, parsed.error, cors);

  try {
    const now = Date.now();
    const ipAllowed =
      service || (await consumePostLimit(env.DB, clientIp(request), now));
    if (!ipAllowed) return errorResponse(429, "rate_limited", cors);
    const sourceBytes = new TextEncoder().encode(parsed.source).byteLength;
    const withinDailyBudget = await consumeDailyPostBudget(
      env.DB,
      now,
      sourceBytes,
    );
    if (!withinDailyBudget) return errorResponse(429, "rate_limited", cors);
    const id = await saveShareBySource(
      env.DB,
      {
        id: createShareId(),
        source: parsed.source,
        createdAt: now,
        expiresAt: now + shareTtlMs(env.SHARE_TTL_DAYS),
      },
      await hashShareSource(parsed.source),
    );
    return json(
      {
        id,
        playgroundUrl: `${shareOrigin}/s/${id}`,
        svgUrl: `${shareOrigin}/s/${id}.svg`,
        pngUrl: `${shareOrigin}/s/${id}.png`,
      },
      201,
      cors,
    );
  } catch {
    return errorResponse(503, "unavailable", cors);
  }
}

async function readShare(
  id: string,
  env: ShareEnv,
  cors: Headers,
): Promise<Response> {
  if (!isShareId(id)) return errorResponse(404, "not_found", cors);
  if (!env.DB) return errorResponse(503, "unavailable", cors);
  const row = await findActiveShare(env.DB, id, Date.now());
  if (!row) return errorResponse(404, "not_found", cors);
  cors.set("cache-control", "no-store");
  return json({ source: row.source }, 200, cors);
}

function imageHeaders(
  contentType: string,
  expiresAt: number,
  now: number,
): Headers {
  const seconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");
  headers.set("x-frame-options", "DENY");
  headers.set("cache-control", `public, max-age=${seconds}`);
  return headers;
}

async function renderImage(
  id: string,
  format: "svg" | "png",
  request: Request,
  env: ShareEnv,
): Promise<Response> {
  if (!isShareId(id)) return errorResponse(404, "not_found");
  const edgeLimit = await checkRateLimit(
    env.SHARE_RENDER_LIMITER,
    clientIp(request),
  );
  if (edgeLimit === "unavailable") return errorResponse(503, "unavailable");
  if (edgeLimit === "limited") return errorResponse(429, "rate_limited");
  if (!env.DB) return errorResponse(503, "unavailable");
  const now = Date.now();
  const row = await findActiveShare(env.DB, id, now);
  if (!row) return errorResponse(404, "not_found");
  if (!acquireRenderSlot()) return errorResponse(503, "unavailable");
  try {
    const raw = await (env.renderSvg ?? renderDiagramSvg)(row.source);
    const svg = sanitizeDiagramSvg(raw);
    if (format === "png") {
      const png = await (env.rasterize ?? rasterizeDiagramSvg)(svg);
      const completedAt = Date.now();
      if (completedAt >= row.expiresAt) {
        return errorResponse(404, "not_found");
      }
      const headers = imageHeaders("image/png", row.expiresAt, completedAt);
      const body = new ArrayBuffer(png.byteLength);
      new Uint8Array(body).set(png);
      return new Response(body, { status: 200, headers });
    }
    const completedAt = Date.now();
    if (completedAt >= row.expiresAt) {
      return errorResponse(404, "not_found");
    }
    const headers = imageHeaders("image/svg+xml", row.expiresAt, completedAt);
    return new Response(svg, { status: 200, headers });
  } catch {
    return errorResponse(503, "unavailable");
  } finally {
    releaseRenderSlot();
  }
}

function redirectShare(id: string, playgroundOrigin: string): Response {
  if (!isShareId(id)) return errorResponse(404, "not_found");
  return new Response(null, {
    status: 302,
    headers: {
      location: `${playgroundOrigin}/?s=${encodeURIComponent(id)}`,
      "cache-control": "no-store",
    },
  });
}
