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
        <h2>Code</h2>
        {hasErrors && <span className="error-indicator">● Errors</span>}
      </div>

      <div className="editor-body">
        <textarea
          id="source"
          className="source-input"
          spellCheck={false}
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="# Enter CloudMer DSL source code
# Example:
direction LR
provider aws

account production {
  region us-east-1 {
    vpc main-vpc {
      subnet app-subnet {
        app: ec2
      }
    }
  }
}"
        />
      </div>
    </section>
  );
}
