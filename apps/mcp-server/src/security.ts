export interface Env {
  MCP_AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
}

export interface SecurityCheckResult {
  authorized: boolean;
  status: number;
  message?: string;
}

/**
 * Validate incoming request authentication token against Worker secret env.MCP_AUTH_TOKEN.
 * If env.MCP_AUTH_TOKEN is not configured, authentication is optional.
 */
export function validateAuthentication(
  request: Request,
  env?: Env,
): SecurityCheckResult {
  if (!env?.MCP_AUTH_TOKEN) {
    return { authorized: true, status: 200 };
  }

  const authHeader = request.headers.get("Authorization");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");

  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (queryToken) {
    token = queryToken.trim();
  }

  if (!token || token !== env.MCP_AUTH_TOKEN) {
    return {
      authorized: false,
      status: 401,
      message: "Unauthorized: Missing or invalid MCP authentication token.",
    };
  }

  return { authorized: true, status: 200 };
}

/**
 * Validate origin header against env.ALLOWED_ORIGINS if set.
 */
export function validateOrigin(request: Request, env?: Env): boolean {
  if (!env?.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS === "*") {
    return true;
  }

  const origin = request.headers.get("Origin");
  if (!origin) return true; // Allow non-browser agents (CLI, Claude Desktop) without Origin header

  const allowedList = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  return allowedList.includes(origin);
}

/**
 * Enforce maximum request payload body size (default 512 KB).
 */
export function validatePayloadSize(
  request: Request,
  maxBytes = 512 * 1024,
): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(bytes) && bytes > maxBytes) {
      return false;
    }
  }
  return true;
}

/**
 * Structured log helper for observability
 */
export function logTelemetry(
  event: "tool_invocation" | "security_event" | "error",
  details: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      event,
      service: "archlex-mcp-server",
      ...details,
    }),
  );
}
