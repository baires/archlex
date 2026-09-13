import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { SERVER_NAME, SERVER_VERSION } from "./protocol/constants.js";
import { acceptedNotificationResponse } from "./protocol/errors.js";
import { modernCorsHeaders } from "./protocol/http-headers.js";
import { handleMcpPost } from "./protocol/router.js";
import { listTools } from "./registry.js";
import { handleStatelessRenderRequest } from "./render-endpoint.js";
import { PayloadTooLargeError, boundedRequest } from "./request-body.js";
import {
  type Env,
  checkRateLimit,
  logTelemetry,
  validateAuthentication,
  validateOrigin,
  validatePayloadSize,
} from "./security.js";
import { createLegacyMcpServer } from "./server.js";

export class WorkerSSEServerTransport implements Transport {
  private controller?: ReadableStreamDefaultController<Uint8Array>;
  private encoder = new TextEncoder();
  private closed = false;
  private cleanup = (): void => {};

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    public sessionId: string,
    private readonly dispose: () => void = () => {},
  ) {}

  async start(): Promise<void> {}

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.cleanup();
    this.dispose();
    try {
      this.controller?.close();
    } catch {
      // Stream already closed.
    }
    this.controller = undefined;
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed || !this.controller) return;
    const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
  }

  createResponse(
    signal?: AbortSignal,
    corsHeaders: Readonly<Record<string, string>> = {},
  ): Response {
    const stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
        const event = `event: endpoint\ndata: /messages?sessionId=${this.sessionId}\n\n`;
        controller.enqueue(this.encoder.encode(event));
        const abort = (): void => {
          void this.close();
        };
        const expiry = setTimeout(abort, 300_000);
        signal?.addEventListener("abort", abort, { once: true });
        this.cleanup = () => {
          clearTimeout(expiry);
          signal?.removeEventListener("abort", abort);
        };
        if (signal?.aborted) abort();
      },
      cancel: () => this.close(),
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        ...corsHeaders,
      },
    });
  }

  handlePostMessage(message: JSONRPCMessage): void {
    if (this.closed) return;
    this.onmessage?.(message);
  }
}

const activeTransports = new Map<string, WorkerSSEServerTransport>();

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Readonly<Record<string, string>>,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json",
    },
  });
}

export default {
  async fetch(incomingRequest: Request, env?: Env): Promise<Response> {
    let request = incomingRequest;
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin");
    const allowOrigin =
      env?.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS !== "*"
        ? requestOrigin && validateOrigin(request, env)
          ? requestOrigin
          : env.ALLOWED_ORIGINS
        : "*";

    if (request.method === "OPTIONS") {
      const cors = modernCorsHeaders(
        listTools({ enableMcpApps: env?.ENABLE_MCP_APPS === "true" }),
      );
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          ...cors,
        },
      });
    }

    // Rate limiting applies to all routes
    const rateLimit = await checkRateLimit(request, env);
    if (!rateLimit.allowed) {
      logTelemetry("security_event", {
        type: "rate_limit_exceeded",
        path: url.pathname,
      });
      return jsonResponse(
        { error: rateLimit.message },
        rateLimit.status,
        { "Access-Control-Allow-Origin": allowOrigin },
        rateLimit.headers,
      );
    }

    // Public render endpoint - skip auth and origin checks
    if (url.pathname.match(/^\/renders\/[^.]+\.png$/)) {
      return handleStatelessRenderRequest(request, env);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOrigin,
    };
    if (!validateOrigin(request, env)) {
      logTelemetry("security_event", {
        type: "invalid_origin",
        origin: request.headers.get("Origin"),
      });
      return jsonResponse({ error: "Forbidden origin" }, 403, corsHeaders);
    }

    const authCheck = validateAuthentication(request, env);
    if (!authCheck.authorized) {
      logTelemetry("security_event", {
        type: "unauthorized",
        path: url.pathname,
      });
      return jsonResponse(
        { error: authCheck.message },
        authCheck.status,
        corsHeaders,
      );
    }

    if (request.method === "POST" && !validatePayloadSize(request)) {
      logTelemetry("security_event", { type: "payload_too_large" });
      return jsonResponse(
        { error: "Payload Too Large: Max size is 512 KB" },
        413,
        corsHeaders,
      );
    }

    if (request.method === "POST") {
      try {
        request = await boundedRequest(request);
      } catch (error: unknown) {
        const tooLarge = error instanceof PayloadTooLargeError;
        return jsonResponse(
          { error: tooLarge ? error.message : "Unable to read request body" },
          tooLarge ? 413 : 400,
          corsHeaders,
        );
      }
    }

    if (url.pathname === "/mcp") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
        });
      }
      return handleMcpPost(request, env, corsHeaders);
    }
    if (url.pathname === "/health") {
      return jsonResponse(
        {
          status: "ok",
          service: SERVER_NAME,
          version: SERVER_VERSION,
          providers: ["aws", "gcp", "k8s"],
          auth_enabled: Boolean(env?.MCP_AUTH_TOKEN),
        },
        200,
        corsHeaders,
      );
    }
    if (url.pathname === "/info") {
      return jsonResponse(
        {
          name: "ArchLex Remote MCP Server",
          version: SERVER_VERSION,
          description:
            "Online Model Context Protocol server for generating cloud architecture diagrams",
          tools: [
            "render_diagram",
            "validate_diagram",
            "get_cloud_catalog",
            "generate_playground_url",
          ],
          streamable_http_endpoint: "/mcp",
          modern_endpoint: "/mcp",
          sse_endpoint: "/sse",
          messages_endpoint: "/messages",
          deprecated_compatibility_endpoints: ["/sse", "/messages"],
          auth_required: Boolean(env?.MCP_AUTH_TOKEN),
        },
        200,
        corsHeaders,
      );
    }
    if (url.pathname === "/sse" && request.method === "GET") {
      if (activeTransports.size >= 100) {
        return jsonResponse(
          { error: "Too many active SSE sessions" },
          503,
          corsHeaders,
          { "Retry-After": "5" },
        );
      }
      const sessionId = crypto.randomUUID();
      const transport = new WorkerSSEServerTransport(sessionId, () => {
        activeTransports.delete(sessionId);
      });
      const server = createLegacyMcpServer(env, request);
      activeTransports.set(sessionId, transport);
      try {
        await server.connect(transport);
        return transport.createResponse(request.signal, corsHeaders);
      } catch {
        await transport.close();
        return jsonResponse(
          { error: "Unable to open SSE session" },
          500,
          corsHeaders,
        );
      }
    }
    if (url.pathname === "/messages" && request.method === "POST") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessionId ? activeTransports.get(sessionId) : undefined;
      if (sessionId && !transport) {
        return jsonResponse(
          { error: "Unknown or expired SSE session" },
          404,
          corsHeaders,
        );
      }
      let body: JSONRPCMessage;
      try {
        body = (await request.json()) as JSONRPCMessage;
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
      }
      if (transport) {
        transport.handlePostMessage(body);
        const response = acceptedNotificationResponse();
        const headers = new Headers(response.headers);
        for (const [name, value] of Object.entries(corsHeaders)) {
          headers.set(name, value);
        }
        return new Response(null, { status: response.status, headers });
      }

      const server = createLegacyMcpServer(env, request);
      let responseMessage: JSONRPCMessage | undefined;
      let resolveResponse: ((message: JSONRPCMessage) => void) | undefined;
      const responsePromise = new Promise<JSONRPCMessage>((resolve) => {
        resolveResponse = resolve;
      });
      const statelessTransport: Transport = {
        async start() {},
        async close() {},
        async send(message: JSONRPCMessage) {
          responseMessage = message;
          resolveResponse?.(message);
        },
      };
      await server.connect(statelessTransport);
      if (statelessTransport.onmessage) {
        Promise.resolve(statelessTransport.onmessage(body)).catch(() => {});
      }
      const timeoutPromise = new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), 5000),
      );
      const resultMessage = await Promise.race([
        responsePromise,
        timeoutPromise,
      ]);
      return jsonResponse(
        resultMessage ?? responseMessage ?? null,
        200,
        corsHeaders,
      );
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
