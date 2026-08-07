import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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
            "Parse ArchLex DSL shorthand code, validate cloud provider rules (AWS/GCP), compute ELK graph layout, and render SVG diagram string with diagnostics and deep-link playground URL.",
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
                description: "SVG rendering theme (default: 'dark')",
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
                description: "Cloud provider ('aws' or 'gcp')",
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
            "Inspect supported cloud providers (AWS, GCP), available service resource kinds, containment scopes (vpc, subnet), and relationship types.",
          inputSchema: {
            type: "object",
            properties: {
              provider: {
                type: "string",
                enum: ["aws", "gcp", "all"],
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

    switch (name) {
      case "render_diagram":
        return handleRenderDiagram(args as unknown as RenderDiagramArgs);
      case "validate_diagram":
        return handleValidateDiagram(args as unknown as ValidateDiagramArgs);
      case "get_cloud_catalog":
        return handleGetCatalog(args as unknown as GetCatalogArgs);
      case "generate_playground_url":
        return handleGeneratePlaygroundUrl(
          args as unknown as GeneratePlaygroundUrlArgs,
        );
      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  });

  // Register Resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "archlex://docs/dsl-syntax",
          name: "ArchLex DSL Syntax Guide",
          mimeType: "text/markdown",
          description: "Cheat sheet for writing ArchLex diagram code.",
        },
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
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

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

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
    };

    // Endpoint: /health
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "archlex-mcp-server",
          version: "0.1.0",
          providers: ["aws", "gcp"],
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
          sse_endpoint: "/sse",
          messages_endpoint: "/messages",
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
      const statelessTransport: Transport = {
        async start() {},
        async close() {},
        async send(message: JSONRPCMessage) {
          responseMessage = message;
        },
      };

      await server.connect(statelessTransport);
      await statelessTransport.onmessage?.(body);

      return new Response(JSON.stringify(responseMessage ?? null), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
