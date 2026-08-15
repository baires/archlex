import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
  defaultProvider: "aws",
});

export interface ValidateDiagramArgs {
  source: string;
  provider?: "aws" | "gcp" | "k8s";
  validation?: "strict" | "normal" | "off";
}

const MAX_SOURCE_LENGTH = 100_000;

export async function handleValidateDiagram(args: ValidateDiagramArgs) {
  const { source, provider, validation = "normal" } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error(
      `Input source exceeds maximum allowed limit of ${MAX_SOURCE_LENGTH} characters.`,
    );
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
