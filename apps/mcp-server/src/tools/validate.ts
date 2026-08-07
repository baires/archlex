import { awsProvider, createArchLex, gcpProvider } from "@archlex/core";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider()],
  defaultProvider: "aws",
});

export interface ValidateDiagramArgs {
  source: string;
  provider?: string;
  validation?: "strict" | "normal" | "off";
}

export async function handleValidateDiagram(args: ValidateDiagramArgs) {
  const { source, provider, validation = "normal" } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  const prepared = archlex.prepare(source, {
    provider,
    validation,
  });

  const formattedDiagnostics = prepared.diagnostics.map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    span: d.span,
  }));

  const errors = formattedDiagnostics.filter((d) => d.severity === "error");
  const warnings = formattedDiagnostics.filter((d) => d.severity === "warning");
  const isValid = errors.length === 0;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            valid: isValid,
            error_count: errors.length,
            warning_count: warnings.length,
            diagnostics: formattedDiagnostics,
            nodes_count: prepared.graph.nodes.length,
            edges_count: prepared.graph.edges.length,
          },
          null,
          2,
        ),
      },
    ],
  };
}
