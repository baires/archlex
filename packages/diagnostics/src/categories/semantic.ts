import type { DiagnosticDefinition } from "../types.js";

export const semanticDiagnostics = new Map<string, DiagnosticDefinition>([
  [
    "CM-SEM-UNKNOWN-RESOURCE",
    {
      code: "CM-SEM-UNKNOWN-RESOURCE",
      category: "semantic",
      severity: "info",
      message: "Unknown service type '${serviceKind}' for provider '${provider}'",
      remediation: "Check the service type name. Use fully qualified names (e.g., 'aws.lambda') for clarity. Consult provider catalog for available services.",
    },
  ],
  [
    "CM-SEM-UNKNOWN-RELATIONSHIP",
    {
      code: "CM-SEM-UNKNOWN-RELATIONSHIP",
      category: "semantic",
      severity: "info",
      message: "Unknown relationship type '${relationshipKind}' between '${leftKind}' and '${rightKind}'",
      remediation: "Verify the relationship type is valid for these services. Common relationships: connects, triggers, stores-data, reads-from.",
    },
  ],
  [
    "CM-SEM-EMPTY-GRAPH",
    {
      code: "CM-SEM-EMPTY-GRAPH",
      category: "semantic",
      severity: "info",
      message: "Document contains no resources or relationships",
      remediation: "Add at least one resource or relationship to create a diagram.",
    },
  ],
]);
