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

  const hasParseErrors = formattedDiagnostics.some((d) =>
    d.code.startsWith("AL-PARSE-"),
  );

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
            ...(hasParseErrors
              ? {
                  hint: 'Parse errors usually come from invalid relationship syntax. A kind inside -[...]-> must be exactly one lowercase word (e.g. -[writes]->, -[routes]->). Free-form display text only goes in pipes: a -[writes]->|PostgreSQL over TLS| b. Avoid spaces, slashes, or special characters inside -[...] and in identifiers; put human-readable names in double-quoted labels: app: ecs["My App"].',
                }
              : {}),
          },
          null,
          2,
        ),
      },
    ],
  };
}
