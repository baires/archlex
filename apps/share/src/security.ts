export const SOURCE_MAX_CHARS = 100_000;
export const MAX_SOURCE_LINES = 2_000;
export const MAX_NODES = 200;
export const MAX_EDGES = 400;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCALHOST_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

export function isShareId(value: string): boolean {
  return (
    value.length > 0 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function encodeShareId(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error("share id must be 16 bytes");
  }
  return encodeBase64Url(bytes);
}

export function createShareId(): string {
  return encodeShareId(crypto.getRandomValues(new Uint8Array(16)));
}

export function createRevokeToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashRevokeToken(token: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function verifyRevokeToken(
  suppliedToken: string,
  expectedHash: string | null | undefined,
): Promise<boolean> {
  if (!expectedHash || !suppliedToken) return false;
  const suppliedHash = await hashRevokeToken(suppliedToken);
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    );
  const [left, right] = await Promise.all([
    digest(suppliedHash),
    digest(expectedHash),
  ]);
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function hashShareSource(source: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export type SourceParseResult =
  | { ok: true; source: string }
  | {
      ok: false;
      status: 400 | 413;
      error: "invalid_request" | "payload_too_large" | "diagram_too_large";
    };

export function parseShareSource(body: unknown): SourceParseResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "invalid_request" };
  }
  const source = (body as { source?: unknown }).source;
  if (typeof source !== "string" || source.trim().length === 0) {
    return { ok: false, status: 400, error: "invalid_request" };
  }
  if (source.length > SOURCE_MAX_CHARS) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }
  const lineCount =
    source.split(/\r\n|\r|\n/).length - Number(/(?:\r\n|\r|\n)$/.test(source));
  if (lineCount > MAX_SOURCE_LINES) {
    return { ok: false, status: 413, error: "diagram_too_large" };
  }
  return { ok: true, source };
}

export function shareTtlMs(ttlDays: string | undefined): number {
  const parsed = Number(ttlDays);
  if (!Number.isInteger(parsed) || parsed <= 0) return 30 * DAY_MS;
  return parsed * DAY_MS;
}

export function isAllowedCorsOrigin(
  origin: string | null,
  playgroundOrigin: string,
): boolean {
  if (!origin) return false;
  if (origin === playgroundOrigin) return true;
  return LOCALHOST_ORIGIN.test(origin);
}

export async function isServiceClient(
  request: Request,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const supplied =
    request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    );
  const [left, right] = await Promise.all([digest(supplied), digest(token)]);
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function clientIp(request: Request): string {
  const raw = request.headers.get("cf-connecting-ip") ?? "";
  if (/^[A-Za-z0-9.:]{1,64}$/.test(raw)) return raw;
  return "unknown";
}

export function corsHeaders(
  origin: string | null,
  playgroundOrigin: string,
): Headers {
  const headers = new Headers();
  if (!origin || !isAllowedCorsOrigin(origin, playgroundOrigin)) return headers;
  headers.set("access-control-allow-origin", origin);
  headers.set("vary", "origin");
  headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  headers.set("access-control-allow-headers", "content-type, authorization");
  return headers;
}
