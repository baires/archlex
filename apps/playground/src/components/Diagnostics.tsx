import type { Diagnostic } from "@cloudmer/model";
import { useState } from "react";

interface DiagnosticsProps {
  diagnostics: readonly Diagnostic[];
  selectedId: string | null;
  onSelectDiagnostic: (id: string) => void;
}

export function Diagnostics({
  diagnostics,
  selectedId,
  onSelectDiagnostic,
}: DiagnosticsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Only show panel when there are diagnostics
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <section
      className={`diagnostics-pane ${isExpanded ? "expanded" : "collapsed"}`}
      data-testid="diagnostics"
      aria-label="Diagnostics"
    >
      <button
        className="pane-header diagnostics-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <h2>
          <span className="toggle-icon">{isExpanded ? "▼" : "▶"}</span>
          Diagnostics ({diagnostics.length})
        </h2>
      </button>

      {isExpanded && (
        <div className="diagnostics-content">
          {diagnostics.length === 0 ? (
            <p className="no-diagnostics">
              ✓ No issues — Architecture validation passed
            </p>
          ) : (
          <ul className="diagnostics-list">
            {diagnostics.map((d, index) => {
              const mainElement = d.elements[0];
              const isSelected = mainElement && mainElement === selectedId;

              return (
                <li
                  key={`${d.code}-${index}`}
                  className={`diagnostic-item ${d.severity} ${isSelected ? "selected" : ""}`}
                  onClick={() => mainElement && onSelectDiagnostic(mainElement)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (mainElement) onSelectDiagnostic(mainElement);
                    }
                  }}
                >
                  <div className="diagnostic-header">
                    <span className={`badge ${d.severity}`}>
                      {d.severity.toUpperCase()}
                    </span>
                    <span className="code">{d.code}</span>
                    <span className="line">Line {d.span.start.line}</span>
                  </div>

                  <p className="message">{d.message}</p>

                  {d.remediation && (
                    <p className="remediation">
                      💡 <strong>Remediation:</strong> {d.remediation}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}
    </section>
  );
}
