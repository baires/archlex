import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  type JSONRPCMessage,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  type Env,
  checkRateLimit,
  logTelemetry,
  validateAuthentication,
  validateOrigin,
  validatePayloadSize,
} from "./security.js";
import { type GetCatalogArgs, handleGetCatalog } from "./tools/catalog.js";
import {
  type GeneratePlaygroundUrlArgs,
  handleGeneratePlaygroundUrl,
} from "./tools/playground.js";
import { type RenderDiagramArgs, handleRenderDiagram } from "./tools/render.js";
import {
  type ValidateDiagramArgs,
  handleValidateDiagram,
} from "./tools/validate.js";
import {
  DIAGRAM_VIEWER_HTML,
  DIAGRAM_VIEWER_MIME_TYPE,
  DIAGRAM_VIEWER_URI,
} from "./ui/diagram-viewer.js";

import { DOC_RESOURCES } from "./generated/docs-resources.js";
import { SYSTEM_PROMPTS } from "./prompts.js";
import { ARCHLEX_EXAMPLES, ARCHLEX_SYNTAX_GUIDE } from "./resources.js";

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
      // Stream already closed
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
        const endpointEvent = `event: endpoint\ndata: /messages?sessionId=${this.sessionId}\n\n`;
        controller.enqueue(this.encoder.encode(endpointEvent));
      },
      cancel: () => {
        this.close();
      },
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

  handlePostMessage(message: JSONRPCMessage) {
    this.onmessage?.(message);
  }
}

function createMcpServer() {
  const server = new Server(
    {
      name: "archlex-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        extensions: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: [DIAGRAM_VIEWER_MIME_TYPE],
          },
        },
      },
    },
  );

  // Register Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "render_diagram",
          description:
            "Parse ArchLex DSL shorthand code, validate provider rules (AWS/GCP/Kubernetes), compute ELK graph layout, and render an SVG diagram. Returns an embedded base64 image preview and metadata. The AI assistant SHOULD display the rendered SVG image inline in its response.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description:
                  "ArchLex shorthand text syntax (e.g. 'direction LR\\nprovider aws\\n rds-proxy > rds > ecs')",
              },
              theme: {
                type: "string",
                enum: ["light", "dark"],
                description: "SVG rendering theme",
              },
              direction: {
                type: "string",
                enum: ["LR", "RL", "TB", "BT"],
                description: "Layout direction (default: 'LR')",
              },
              validation: {
                type: "string",
                enum: ["strict", "normal", "off"],
                description: "Validation mode",
              },
            },
            required: ["source"],
          },
          outputSchema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              svg: { type: "string" },
              diagnostics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: { type: "string" },
                    severity: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
              playground_url: { type: "string" },
              nodes_count: { type: "number" },
              edges_count: { type: "number" },
            },
            required: ["success", "svg"],
          },
          _meta: {
            ui: {
              resourceUri: DIAGRAM_VIEWER_URI,
            },
          },
        },
        {
          name: "validate_diagram",
          description:
            "Perform fast syntax parsing and cloud semantic validation without rendering full SVG.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "ArchLex shorthand text syntax to validate",
              },
              provider: {
                type: "string",
                enum: ["aws", "gcp", "k8s"],
                description: "Cloud provider ('aws', 'gcp', or 'k8s')",
              },
              validation: {
                type: "string",
                enum: ["strict", "normal", "off"],
                description: "Validation mode",
              },
            },
            required: ["source"],
          },
        },
        {
          name: "get_cloud_catalog",
          description:
            "Inspect supported providers (AWS, GCP, Kubernetes), available resource kinds, containment scopes, and relationship types.",
          inputSchema: {
            type: "object",
            properties: {
              provider: {
                type: "string",
                enum: ["aws", "gcp", "k8s", "all"],
                description: "Provider catalog filter",
              },
            },
          },
        },
        {
          name: "generate_playground_url",
          description:
            "Generate a deep-link URL to open and edit the ArchLex diagram interactively in the web playground.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "ArchLex shorthand code to open in playground",
              },
            },
            required: ["source"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const startTime = performance.now();

    try {
      let result: {
        content: (
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: string }
        )[];
        structuredContent?: Record<string, unknown>;
      };
      switch (name) {
        case "render_diagram":
          result = await handleRenderDiagram(
            args as unknown as RenderDiagramArgs,
          );
          break;
        case "validate_diagram":
          result = await handleValidateDiagram(
            args as unknown as ValidateDiagramArgs,
          );
          break;
        case "get_cloud_catalog":
          result = await handleGetCatalog(args as unknown as GetCatalogArgs);
          break;
        case "generate_playground_url":
          result = await handleGeneratePlaygroundUrl(
            args as unknown as GeneratePlaygroundUrlArgs,
          );
          break;
        default:
          throw new Error(`Unknown tool name: ${name}`);
      }

      const durationMs = Math.round(performance.now() - startTime);
      logTelemetry("tool_invocation", {
        tool: name,
        success: true,
        durationMs,
      });

      return result;
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      const errorMessage = err instanceof Error ? err.message : String(err);
      logTelemetry("error", {
        tool: name,
        success: false,
        error: errorMessage,
        durationMs,
      });
      throw err;
    }
  });

  // Register Resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const syncedDocs = Object.values(DOC_RESOURCES).map((doc) => ({
      uri: doc.uri,
      name: doc.name,
      mimeType: doc.mimeType,
      description: doc.description,
    }));

    return {
      resources: [
        {
          uri: DIAGRAM_VIEWER_URI,
          name: "ArchLex Diagram Viewer",
          mimeType: DIAGRAM_VIEWER_MIME_TYPE,
          description:
            "Interactive viewer for render_diagram results (MCP Apps).",
          _meta: {
            ui: {
              prefersBorder: true,
            },
          },
        },
        {
          uri: "archlex://docs/dsl-syntax",
          name: "ArchLex DSL Syntax Guide",
          mimeType: "text/markdown",
          description: "Cheat sheet for writing ArchLex diagram code.",
        },
        ...syncedDocs,
        {
          uri: "archlex://examples/aws-microservices",
          name: "AWS Microservices Example",
          mimeType: "text/plain",
          description: "Example AWS architecture diagram code.",
        },
        {
          uri: "archlex://examples/gcp-data-pipeline",
          name: "GCP Data Pipeline Example",
          mimeType: "text/plain",
          description: "Example GCP architecture diagram code.",
        },
        {
          uri: "archlex://examples/k8s-microservices",
          name: "Kubernetes Microservices Example",
          mimeType: "text/plain",
          description: "Example Kubernetes architecture diagram code.",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === DIAGRAM_VIEWER_URI) {
      return {
        contents: [
          {
            uri,
            mimeType: DIAGRAM_VIEWER_MIME_TYPE,
            text: DIAGRAM_VIEWER_HTML,
            _meta: {
              ui: {
                prefersBorder: true,
              },
            },
          },
        ],
      };
    }

    if (DOC_RESOURCES[uri]) {
      return {
        contents: [
          {
            uri,
            mimeType: DOC_RESOURCES[uri].mimeType,
            text: DOC_RESOURCES[uri].text,
          },
        ],
      };
    }

    if (uri === "archlex://docs/dsl-syntax") {
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: ARCHLEX_SYNTAX_GUIDE,
          },
        ],
      };
    }

    if (uri === "archlex://examples/aws-microservices") {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: ARCHLEX_EXAMPLES["aws-microservices"],
          },
        ],
      };
    }

    if (uri === "archlex://examples/gcp-data-pipeline") {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: ARCHLEX_EXAMPLES["gcp-data-pipeline"],
          },
        ],
      };
    }

    if (uri === "archlex://examples/k8s-microservices") {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: ARCHLEX_EXAMPLES["k8s-microservices"],
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  // Register Prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: SYSTEM_PROMPTS.architect_cloud_infrastructure.name,
          description:
            SYSTEM_PROMPTS.architect_cloud_infrastructure.description,
          arguments: SYSTEM_PROMPTS.architect_cloud_infrastructure.arguments,
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === SYSTEM_PROMPTS.architect_cloud_infrastructure.name) {
      return {
        messages:
          SYSTEM_PROMPTS.architect_cloud_infrastructure.generateMessages(
            args as unknown as { provider: string; requirements: string },
          ),
      };
    }

    throw new Error(`Prompt not found: ${name}`);
  });

  return server;
}

// Active session transports
const activeTransports = new Map<string, WorkerSSEServerTransport>();

async function handleStreamableHttpRequest(
  request: Request,
  corsHeaders: Readonly<Record<string, string>>,
): Promise<Response> {
  const server = createMcpServer();
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

export default {
  async fetch(request: Request, env?: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
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

    // 2. Validate Origin Header
    if (!validateOrigin(request, env)) {
      logTelemetry("security_event", {
        type: "invalid_origin",
        origin: request.headers.get("Origin"),
      });
      return new Response(JSON.stringify({ error: "Forbidden origin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Validate Authentication (if env.MCP_AUTH_TOKEN is configured)
    const authCheck = validateAuthentication(request, env);
    if (!authCheck.authorized) {
      logTelemetry("security_event", {
        type: "unauthorized",
        path: url.pathname,
      });
      return new Response(JSON.stringify({ error: authCheck.message }), {
        status: authCheck.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Rate Limiting Check
    const rateLimit = await checkRateLimit(request, env);
    if (!rateLimit.allowed) {
      logTelemetry("security_event", {
        type: "rate_limit_exceeded",
        path: url.pathname,
      });
      return new Response(JSON.stringify({ error: rateLimit.message }), {
        status: rateLimit.status,
        headers: {
          ...corsHeaders,
          ...rateLimit.headers,
          "Content-Type": "application/json",
        },
      });
    }

    // 5. Validate Maximum Payload Size (512 KB)
    if (request.method === "POST" && !validatePayloadSize(request)) {
      logTelemetry("security_event", { type: "payload_too_large" });
      return new Response(
        JSON.stringify({ error: "Payload Too Large: Max size is 512 KB" }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Endpoint: /mcp (Streamable HTTP, stateless)
    if (url.pathname === "/mcp") {
      return handleStreamableHttpRequest(request, corsHeaders);
    }

    // Endpoint: /health
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "archlex-mcp-server",
          version: "0.1.0",
          providers: ["aws", "gcp", "k8s"],
          auth_enabled: Boolean(env?.MCP_AUTH_TOKEN),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Endpoint: /info
    if (url.pathname === "/info") {
      return new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Endpoint: GET /sse
    if (url.pathname === "/sse" && request.method === "GET") {
      const sessionId = crypto.randomUUID();
      const transport = new WorkerSSEServerTransport(sessionId);
      const server = createMcpServer();

      activeTransports.set(sessionId, transport);
      await server.connect(transport);

      return transport.createResponse();
    }

    // Endpoint: POST /messages
    if (url.pathname === "/messages" && request.method === "POST") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessionId ? activeTransports.get(sessionId) : undefined;
      const body = (await request.json()) as JSONRPCMessage;

      if (transport) {
        transport.handlePostMessage(body);
        return new Response("Accepted", { status: 202, headers: corsHeaders });
      }

      // Stateless request execution fallback
      const server = createMcpServer();
      let responseMessage: JSONRPCMessage | undefined;
      let resolveResponse: ((msg: JSONRPCMessage) => void) | undefined;
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
        setTimeout(() => resolve(undefined), 3000),
      );

      const resultMessage = await Promise.race([
        responsePromise,
        timeoutPromise,
      ]);

      return new Response(
        JSON.stringify(resultMessage ?? responseMessage ?? null),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
