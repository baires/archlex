/**
 * Legacy SDK server boundary.
 *
 * Phase 0 keeps the production transport on SDK v1 while the shared registry
 * and modern protocol contract use SDK v2. Plain MCP wire values are the only
 * values that cross this boundary, which makes the later transport migration
 * mechanical instead of coupling handlers to either SDK generation.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SERVER_INFO } from "./protocol/constants.js";
import {
  SERVER_INSTRUCTIONS,
  callTool,
  getPrompt,
  listPrompts,
  listResources,
  listTools,
  readResource,
} from "./registry.js";
import type { Env } from "./security.js";
import { parseRenderUrlConfig } from "./security.js";
import { DIAGRAM_VIEWER_MIME_TYPE } from "./ui/diagram-viewer.js";

export function createLegacyMcpServer(env?: Env, request?: Request): Server {
  const options = {
    enableMcpApps: env?.ENABLE_MCP_APPS === "true",
    renderLinkConfig: request
      ? {
          ...parseRenderUrlConfig(env),
          baseUrl: new URL(request.url).origin,
        }
      : undefined,
  };
  const server = new Server(
    { name: SERVER_INFO.name, version: SERVER_INFO.version },
    {
      instructions: SERVER_INSTRUCTIONS,
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

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listTools(options),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callTool(request.params.name, request.params.arguments, options),
  );
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listResources(),
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (request) =>
    readResource(request.params.uri),
  );
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: listPrompts(),
  }));
  server.setRequestHandler(GetPromptRequestSchema, async (request) =>
    getPrompt(request.params.name, request.params.arguments),
  );

  return server;
}

export async function handleLegacyMcpPost(
  request: Request,
  env?: Env,
): Promise<Response> {
  const server = createLegacyMcpServer(env, request);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
