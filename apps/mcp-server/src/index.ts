import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { acceptedNotificationResponse } from "./protocol/errors.js";
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

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(public sessionId: string) {}

  async start(): Promise<void> {}

  async close(): Promise<void> {
    try {
      this.controller?.close();
    } catch {
      // Stream already closed.
    }
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.controller) return;
    const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
  }

  createResponse(): Response {
    const stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
        const event = `event: endpoint\ndata: /messages?sessionId=${this.sessionId}\n\n`;
        controller.enqueue(this.encoder.encode(event));
      },
      cancel: () => this.close(),
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  handlePostMessage(message: JSONRPCMessage): void {
    this.onmessage?.(message);
  }
}

const activeTransports = new Map<string, WorkerSSEServerTransport>();

async function handleStreamableHttpRequest(
  request: Request,
  corsHeaders: Readonly<Record<string, string>>,
  env?: Env,
): Promise<Response> {
  const server = createLegacyMcpServer(env);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
  async fetch(request: Request, env?: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env?.ALLOWED_ORIGINS || "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": env?.ALLOWED_ORIGINS || "*",
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

    const rateLimit = await checkRateLimit(request, env);
    if (!rateLimit.allowed) {
      logTelemetry("security_event", {
        type: "rate_limit_exceeded",
        path: url.pathname,
      });
      return jsonResponse(
        { error: rateLimit.message },
        rateLimit.status,
        corsHeaders,
        rateLimit.headers,
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

    if (url.pathname === "/mcp") {
      return handleStreamableHttpRequest(request, corsHeaders, env);
    }
    if (url.pathname === "/health") {
      return jsonResponse(
        {
          status: "ok",
          service: "archlex-mcp-server",
          version: "0.1.0",
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
          description:
            "Online Model Context Protocol server for generating cloud architecture diagrams",
          tools: [
            "render_diagram",
            "validate_diagram",
            "get_cloud_catalog",
            "generate_playground_url",
          ],
          streamable_http_endpoint: "/mcp",
          sse_endpoint: "/sse",
          messages_endpoint: "/messages",
          auth_required: Boolean(env?.MCP_AUTH_TOKEN),
        },
        200,
        corsHeaders,
      );
    }
    if (url.pathname === "/sse" && request.method === "GET") {
      const sessionId = crypto.randomUUID();
      const transport = new WorkerSSEServerTransport(sessionId);
      const server = createLegacyMcpServer(env);
      activeTransports.set(sessionId, transport);
      await server.connect(transport);
      return transport.createResponse();
    }
    if (url.pathname === "/messages" && request.method === "POST") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessionId ? activeTransports.get(sessionId) : undefined;
      const body = (await request.json()) as JSONRPCMessage;
      if (transport) {
        transport.handlePostMessage(body);
        const response = acceptedNotificationResponse();
        const headers = new Headers(response.headers);
        for (const [name, value] of Object.entries(corsHeaders)) {
          headers.set(name, value);
        }
        return new Response(null, { status: response.status, headers });
      }

      const server = createLegacyMcpServer(env);
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
