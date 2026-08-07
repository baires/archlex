import { awsProvider, createArchLex, gcpProvider } from "@archlex/core";
import { createInlineLayoutEngine } from "@archlex/layout-elk";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider()],
  defaultProvider: "aws",
  layoutEngine: createInlineLayoutEngine(),
});

export interface RenderDiagramArgs {
  source: string;
  theme?: "light" | "dark";
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "strict" | "normal" | "off";
}

export async function handleRenderDiagram(args: RenderDiagramArgs) {
  const { source, theme = "dark", direction, validation } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
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

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: !hasErrors,
            svg: result.svg,
            diagnostics: formattedDiagnostics,
            playground_url: playgroundUrl,
            nodes_count: result.graph.nodes.length,
            edges_count: result.graph.edges.length,
          },
          null,
          2,
        ),
      },
    ],
  };
}
