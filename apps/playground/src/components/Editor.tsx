import type { Diagnostic } from "@cloudmer/model";

interface EditorProps {
  source: string;
  onSourceChange: (newSource: string) => void;
  diagnostics: readonly Diagnostic[];
}

export function Editor({ source, onSourceChange, diagnostics }: EditorProps) {
  const hasErrors = diagnostics.some((d) => d.severity === "error");

  return (
    <section className="editor-pane" aria-label="CloudMer Source Editor">
      <div className="pane-header">
        <h2>Source Code</h2>
        {hasErrors && <span className="error-indicator">● Errors found</span>}
      </div>

      <div className="editor-body">
        <textarea
          id="source"
          className="source-input"
          spellCheck={false}
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="Enter CloudMer DSL source code..."
        />
      </div>
    </section>
  );
}
