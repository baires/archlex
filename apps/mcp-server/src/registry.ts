import type {
  CallToolResult,
  GetPromptResult,
  Prompt,
  ReadResourceResult,
  Resource,
  Tool,
} from "@modelcontextprotocol/server";
import { DOC_RESOURCES } from "./generated/docs-resources.js";
import { SYSTEM_PROMPTS } from "./prompts.js";
import { ARCHLEX_EXAMPLES, ARCHLEX_SYNTAX_GUIDE } from "./resources.js";
import { logTelemetry } from "./security.js";
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

export const SERVER_INSTRUCTIONS = `Use render_diagram directly for normal diagram requests; it performs syntax and semantic validation internally. Do not call validate_diagram first unless the user requests validation-only or rendering failed. Do not call get_cloud_catalog for common cloud services; when an identifier is unknown, call it once with a focused query. Canonical syntax: app: ecs["Next.js"] and cdn -[routes]-> app. Square brackets label nodes, not edges. render_diagram already returns an embedded image and playground_url, so do not call generate_playground_url after rendering. Display successful images inline. If rendering reports errors, repair from its diagnostics and retry once.`;

export interface RegistryOptions {
  enableMcpApps: boolean;
}

export function listTools(options: RegistryOptions): Tool[] {
  const renderDiagram: Tool = {
    name: "render_diagram",
    description:
      'Parse ArchLex DSL shorthand code, hydrate cloud service icons, validate provider rules (AWS/GCP/Kubernetes), compute ELK graph layout, and render a PNG diagram. **Display the image inline**, then include the exact final source in an `archlex` fenced code block; do not show raw SVG source code or JSON metadata. The image is the primary output; metadata is supplementary. Workflow: call `get_cloud_catalog` first to discover exact resource kind names, iterate with `validate_diagram` until clean, then render — diagnostics are included in this tool\'s response, so rendering also confirms validity. Relationship kinds inside `-[kind]->` are single lowercase words (e.g. `writes`, `routes`); put free-form display text in pipes: `a -[writes]->|PostgreSQL| b`. Clients that cannot display images: pass `format: "svg"` to skip the PNG, save the returned SVG (in content or `structuredContent.svg`) to a `.svg` file, and open it with your own file/image tooling.',
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description:
            'ArchLex DSL. Canonical forms: app: ecs["Next.js"]; cdn -[routes]-> app; or rds-proxy > rds > ecs. Start with direction LR and provider aws/gcp/k8s.',
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
        format: {
          type: "string",
          enum: ["png", "svg"],
          description:
            "Output format. 'png' (default) returns a base64 PNG image block. 'svg' skips rasterization and returns raw SVG text — cheaper and better for text-only clients that save the result to a file.",
        },
      },
      required: ["source"],
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        source: { type: "string" },
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
      required: ["success", "source"],
    },
  };

  if (options.enableMcpApps) {
    renderDiagram._meta = { ui: { resourceUri: DIAGRAM_VIEWER_URI } };
  }

  return [
    renderDiagram,
    {
      name: "validate_diagram",
      description:
        "Perform fast syntax parsing and cloud semantic validation without rendering full SVG. On parse errors the response includes a `hint` field with the likely fix — use this tool to iterate on source before calling render_diagram.",
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
        "Find provider resource identifiers and metadata when an identifier is unknown. Do not call for common services. Use query for compact results; an unfiltered request returns the large compatibility catalog.",
      inputSchema: {
        type: "object",
        properties: {
          provider: {
            type: "string",
            enum: ["aws", "gcp", "k8s", "all"],
            description: "Provider catalog filter",
          },
          query: {
            type: "string",
            description:
              "Case-insensitive search across service IDs, display names, aliases, search terms, and categories. Prefer a focused query.",
          },
          category: {
            type: "string",
            description:
              "Optional exact category filter, such as compute, database, networking, or storage.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 20,
            description: "Maximum compact matches to return.",
          },
        },
      },
    },
    {
      name: "generate_playground_url",
      description:
        "Generate a playground deep link without rendering. Do not call it after render_diagram, because render_diagram already returns playground_url. Use only when the user wants an editable URL without an image.",
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
  ];
}

export async function callTool(
  name: string,
  args: Record<string, unknown> | undefined,
  context: RegistryOptions,
): Promise<CallToolResult> {
  const startTime = performance.now();
  try {
    let result: CallToolResult;
    switch (name) {
      case "render_diagram":
        result = await handleRenderDiagram(
          args as unknown as RenderDiagramArgs,
          {
            enableMcpApps: context.enableMcpApps,
          },
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

    logTelemetry("tool_invocation", {
      tool: name,
      success: true,
      durationMs: Math.round(performance.now() - startTime),
    });
    return result;
  } catch (error: unknown) {
    logTelemetry("error", {
      tool: name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Math.round(performance.now() - startTime),
    });
    throw error;
  }
}

export function listResources(): Resource[] {
  const syncedDocs = Object.values(DOC_RESOURCES).map((doc) => ({
    uri: doc.uri,
    name: doc.name,
    mimeType: doc.mimeType,
    description: doc.description,
  }));
  return [
    {
      uri: DIAGRAM_VIEWER_URI,
      name: "ArchLex Diagram Viewer",
      mimeType: DIAGRAM_VIEWER_MIME_TYPE,
      description: "Interactive viewer for render_diagram results (MCP Apps).",
      _meta: { ui: { prefersBorder: true } },
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
  ];
}

export function readResource(uri: string): ReadResourceResult {
  if (uri === DIAGRAM_VIEWER_URI) {
    return {
      contents: [
        {
          uri,
          mimeType: DIAGRAM_VIEWER_MIME_TYPE,
          text: DIAGRAM_VIEWER_HTML,
          _meta: { ui: { prefersBorder: true } },
        },
      ],
    };
  }
  const doc = DOC_RESOURCES[uri];
  if (doc) {
    return {
      contents: [{ uri, mimeType: doc.mimeType, text: doc.text }],
    };
  }
  if (uri === "archlex://docs/dsl-syntax") {
    return {
      contents: [
        { uri, mimeType: "text/markdown", text: ARCHLEX_SYNTAX_GUIDE },
      ],
    };
  }
  const exampleKey = uri.replace("archlex://examples/", "");
  const example = ARCHLEX_EXAMPLES[exampleKey as keyof typeof ARCHLEX_EXAMPLES];
  if (uri.startsWith("archlex://examples/") && example) {
    return { contents: [{ uri, mimeType: "text/plain", text: example }] };
  }
  throw new Error(`Resource not found: ${uri}`);
}

export function listPrompts(): Prompt[] {
  const prompt = SYSTEM_PROMPTS.architect_cloud_infrastructure;
  return [
    {
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    },
  ];
}

export function getPrompt(
  name: string,
  args: Record<string, string> | undefined,
): GetPromptResult {
  const prompt = SYSTEM_PROMPTS.architect_cloud_infrastructure;
  if (name !== prompt.name) {
    throw new Error(`Prompt not found: ${name}`);
  }
  return {
    messages: prompt.generateMessages(
      args as {
        provider: string;
        requirements: string;
      },
    ),
  };
}
