export interface Env {
  MCP_AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  ENABLE_MCP_APPS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  MCP_REQUEST_TIMEOUT_MS?: string;
  MCP_MAX_REQUEST_TIMEOUT_MS?: string;
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
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
 * In-memory sliding window rate limiter fallback
 */
class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();

  check(
    ip: string,
    maxRequests = 60,
    windowMs = 60_000,
  ): { allowed: boolean; remaining: number; resetSeconds: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.requests.get(ip) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0] || now;
      const resetSeconds = Math.max(
        1,
        Math.ceil((oldestInWindow + windowMs - now) / 1000),
      );
      return { allowed: false, remaining: 0, resetSeconds };
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  reset() {
    this.requests.clear();
  }
}

export const inMemoryRateLimiter = new InMemoryRateLimiter();

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

/**
 * Check IP rate limits using Cloudflare binding or in-memory fallback
 */
export async function checkRateLimit(
  request: Request,
  env?: Env,
): Promise<{
  allowed: boolean;
  status: number;
  message?: string;
  headers?: Record<string, string>;
}> {
  const ip = getClientIp(request);
  const maxRequests = Number.parseInt(env?.RATE_LIMIT_MAX_REQUESTS || "60", 10);
  const windowSeconds = Number.parseInt(
    env?.RATE_LIMIT_WINDOW_SECONDS || "60",
    10,
  );

  // If Cloudflare Native Rate Limiter binding is available
  if (env?.RATE_LIMITER) {
    try {
      const res = await env.RATE_LIMITER.limit({ key: ip });
      if (!res.success) {
        return {
          allowed: false,
          status: 429,
          message:
            "Too Many Requests: Rate limit exceeded. Please try again later.",
          headers: { "Retry-After": String(windowSeconds) },
        };
      }
      return { allowed: true, status: 200 };
    } catch {
      // Fallback to in-memory rate limiter on binding error
    }
  }

  const result = inMemoryRateLimiter.check(
    ip,
    maxRequests,
    windowSeconds * 1000,
  );
  if (!result.allowed) {
    return {
      allowed: false,
      status: 429,
      message: `Too Many Requests: Exceeded rate limit of ${maxRequests} requests per ${windowSeconds}s.`,
      headers: {
        "Retry-After": String(result.resetSeconds),
        "X-RateLimit-Limit": String(maxRequests),
        "X-RateLimit-Remaining": "0",
      },
    };
  }

  return {
    allowed: true,
    status: 200,
    headers: {
      "X-RateLimit-Limit": String(maxRequests),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  };
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
