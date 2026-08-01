import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticContext,
  DiagnosticDefinition,
  SourceSpan,
} from "./types.js";
import { interpolate } from "./templates.js";

export function createDiagnostic(
  code: DiagnosticCode,
  context: DiagnosticContext,
  span: SourceSpan,
  elements: readonly string[] = [],
  registry: Map<string, DiagnosticDefinition>
): Diagnostic {
  const definition = registry.get(code);

  if (!definition) {
    throw new Error(`Unknown diagnostic code: ${code}`);
  }

  const message = interpolate(definition.message, context);
  const remediation = interpolate(definition.remediation, context);

  return {
    code,
    severity: definition.severity,
    message,
    span,
    elements: [...elements],
    remediation,
  };
}
