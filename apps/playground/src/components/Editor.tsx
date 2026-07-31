interface EditorProps {
  source: string;
  onSourceChange: (newSource: string) => void;
  documentLabel: string;
  onCursorChange: (position: { line: number; column: number }) => void;
}

export function Editor({
  source,
  onSourceChange,
  documentLabel,
  onCursorChange,
}: EditorProps) {
  return (
    <section className="editor-pane" aria-label="CloudMer Source Editor">
      <div className="pane-header">
        <h2>{documentLabel}</h2>
        <span className="editor-source-label">SOURCE</span>
      </div>

      <div className="editor-body">
        <textarea
          id="source"
          className="source-input"
          spellCheck={false}
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          onSelect={(event) => {
            const beforeCursor = event.currentTarget.value.slice(
              0,
              event.currentTarget.selectionStart,
            );
            const lines = beforeCursor.split("\n");
            onCursorChange({
              line: lines.length,
              column: (lines.at(-1)?.length ?? 0) + 1,
            });
          }}
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
