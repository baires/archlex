import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { createInlineLayoutEngine } from "@archlex/layout-elk";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
  defaultProvider: "aws",
  layoutEngine: createInlineLayoutEngine(),
});

export interface RenderDiagramArgs {
  source: string;
  theme?: "light" | "dark";
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "strict" | "normal" | "off";
}

const MAX_SOURCE_LENGTH = 100_000;

export async function handleRenderDiagram(args: RenderDiagramArgs) {
  const { source, theme, direction, validation } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error(
      `Input source exceeds maximum allowed limit of ${MAX_SOURCE_LENGTH} characters.`,
    );
  }

  const result = await archlex.render(source, {
    theme,
    direction,
    validation,
  });

  const encodedSource = encodeURIComponent(source);
  const playgroundUrl = `https://playground.archlex.dev/?code=${encodedSource}`;

  const formattedDiagnostics = result.diagnostics.map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    span: d.span,
  }));

  const hasErrors = result.diagnostics.some((d) => d.severity === "error");

  const base64Svg = btoa(unescape(encodeURIComponent(result.svg)));

  // Structured content with all metadata for programmatic access
  const payload = {
    success: !hasErrors,
    svg: result.svg,
    diagnostics: formattedDiagnostics,
    playground_url: playgroundUrl,
    nodes_count: result.graph.nodes.length,
    edges_count: result.graph.edges.length,
  };

  // Minimal text summary for agents
  const errorCount = result.diagnostics.filter(
    (d) => d.severity === "error",
  ).length;
  const textSummary = hasErrors
    ? `✗ Rendering failed: ${errorCount} error${errorCount === 1 ? "" : "s"}`
    : `✓ Rendered successfully: ${result.graph.nodes.length} node${result.graph.nodes.length === 1 ? "" : "s"}, ${result.graph.edges.length} edge${result.graph.edges.length === 1 ? "" : "s"}`;

  return {
    content: [
      {
        type: "image" as const,
        data: base64Svg,
        mimeType: "image/svg+xml",
      },
      {
        type: "text" as const,
        text: textSummary,
      },
    ],
    // Structured mirror of the text payload for MCP Apps hosts: the
    // ui://archlex/diagram-viewer iframe renders from this directly.
    structuredContent: payload,
  };
}
