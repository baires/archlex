import type { Diagnostic } from "@cloudmer/model";

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
  return (
    <section
      className="diagnostics-pane"
      data-testid="diagnostics"
      aria-label="Diagnostics"
    >
      <div className="pane-header">
        <h2>Diagnostics ({diagnostics.length})</h2>
      </div>

      <div className="diagnostics-content">
        {diagnostics.length === 0 ? (
          <p className="no-diagnostics">
            ✓ Architecture validation clean — 0 diagnostics.
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
    </section>
  );
}
