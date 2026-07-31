import type { Diagnostic } from "@cloudmer/model";
import {
  type DiagnosticSummary,
  summarizeDiagnostics,
} from "./workspace-state.js";

export interface RenderIssue {
  id: "playground-render-failure";
  severity: "error";
  title: "Internal render failure";
  detail: string;
  recovery: string;
}

export function createRenderIssue(error: unknown): RenderIssue {
  return {
    id: "playground-render-failure",
    severity: "error",
    title: "Internal render failure",
    detail: error instanceof Error ? error.message : "Unexpected render error",
    recovery:
      "The last successful diagram is still shown. Review the source or render options and try again.",
  };
}

export function summarizeStatusDiagnostics(
  diagnostics: readonly Diagnostic[],
  renderIssue: RenderIssue | null,
): DiagnosticSummary {
  const semanticSummary = summarizeDiagnostics(diagnostics);
  if (!renderIssue) return semanticSummary;
  return {
    ...semanticSummary,
    error: semanticSummary.error + 1,
    total: semanticSummary.total + 1,
  };
}
