import type { Diagnostic } from "@cloudmer/model";
import type { OperationMessage } from "../App.js";
import type { DiagnosticFilter } from "./DiagnosticsDrawer.js";
import type { DiagnosticSummary } from "./workspace-state.js";

interface StatusBarProps {
  provider: "aws" | "gcp" | "unknown";
  cursor: { line: number; column: number };
  summary: DiagnosticSummary;
  activeFilter: DiagnosticFilter;
  isRendering: boolean;
  renderDurationMs: number | null;
  operationMessage: OperationMessage;
  onOpenDiagnostics: (filter: DiagnosticFilter) => void;
}

const severityLabels: Record<Diagnostic["severity"], string> = {
  error: "error",
  warning: "warning",
  info: "info",
};

const severities: readonly Diagnostic["severity"][] = [
  "error",
  "warning",
  "info",
];

function diagnosticSummaryAnnouncement(summary: DiagnosticSummary): string {
  return `${summary.error} errors, ${summary.warning} warnings, ${summary.info} information`;
}

export function StatusBar({
  provider,
  cursor,
  summary,
  activeFilter,
  isRendering,
  renderDurationMs,
  operationMessage,
  onOpenDiagnostics,
}: StatusBarProps) {
  const renderStatus = isRendering
    ? "Rendering"
    : renderDurationMs === null
      ? "Ready"
      : `Ready · ${renderDurationMs} ms`;

  return (
    <footer className="render-metadata workspace-status-bar">
      <div className="status-diagnostics" aria-label="Diagnostic counts">
        {severities.map((severity) => {
          const count = summary[severity];
          if (count === 0) return null;

          const label = severityLabels[severity];
          const countLabel = `${count} ${label}${count === 1 ? "" : "s"}`;
          return (
            <button
              key={severity}
              type="button"
              className={`status-diagnostic-count ${severity}`}
              aria-label={`${countLabel}, open diagnostics`}
              aria-pressed={activeFilter === severity}
              onClick={() => onOpenDiagnostics(severity)}
            >
              <span className="status-severity-marker" aria-hidden="true" />
              {countLabel}
            </button>
          );
        })}
      </div>

      <div className="status-metadata">
        <span>
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span className="status-provider">
          Provider {provider.toUpperCase()}
        </span>
        <span className={isRendering ? "rendering" : "ready"}>
          {renderStatus}
        </span>
      </div>

      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {diagnosticSummaryAnnouncement(summary)}
      </div>
      <div
        className={`status-operation${operationMessage ? ` ${operationMessage.tone}` : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {operationMessage?.text ?? ""}
      </div>
    </footer>
  );
}
