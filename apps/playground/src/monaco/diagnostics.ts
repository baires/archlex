import type { Diagnostic } from "@archlex/model";
import type * as Monaco from "monaco-editor";

/**
 * Convert ArchLex diagnostics to Monaco markers
 */
export function diagnosticsToMarkers(
  diagnostics: readonly Diagnostic[],
): Monaco.editor.IMarkerData[] {
  return diagnostics.map((diagnostic) => ({
    severity:
      diagnostic.severity === "error"
        ? 8 // MarkerSeverity.Error
        : diagnostic.severity === "warning"
          ? 4 // MarkerSeverity.Warning
          : 2, // MarkerSeverity.Info
    startLineNumber: diagnostic.span.start.line,
    startColumn: diagnostic.span.start.column,
    endLineNumber: diagnostic.span.end.line,
    endColumn: diagnostic.span.end.column,
    message: diagnostic.message,
    code: diagnostic.code || undefined,
  }));
}

/**
 * Set diagnostics as Monaco markers
 */
export function setDiagnosticMarkers(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  diagnostics: readonly Diagnostic[],
): void {
  const markers = diagnosticsToMarkers(diagnostics);
  monaco.editor.setModelMarkers(model, "archlex", markers);
}
