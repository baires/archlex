import type { Diagnostic } from "@cloudmer/model";

export const DEFAULT_SPLIT_RATIO = 0.4;
export const MIN_SPLIT_RATIO = 0.25;
export const MAX_SPLIT_RATIO = 0.7;

export interface DiagnosticSummary {
  error: number;
  warning: number;
  info: number;
  total: number;
}

export function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_RATIO;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value));
}

export function summarizeDiagnostics(
  diagnostics: readonly Diagnostic[],
): DiagnosticSummary {
  const summary: DiagnosticSummary = {
    error: 0,
    warning: 0,
    info: 0,
    total: diagnostics.length,
  };
  for (const item of diagnostics) summary[item.severity] += 1;
  return summary;
}

export function shouldAutoOpenDiagnostics(
  previous: DiagnosticSummary,
  next: DiagnosticSummary,
): boolean {
  return previous.error === 0 && next.error > 0;
}
