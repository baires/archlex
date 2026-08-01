import type { SourceSpan } from "@cloudmer/model";
import { useEffect, useRef } from "react";

export interface EditorSelection {
  span: SourceSpan;
  requestId: number;
}

interface EditorProps {
  source: string;
  onSourceChange: (newSource: string) => void;
  documentLabel: string;
  onCursorChange: (position: { line: number; column: number }) => void;
  selection: EditorSelection | null;
}

export function Editor({
  source,
  onSourceChange,
  documentLabel,
  onCursorChange,
  selection,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selection) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = Math.min(selection.span.start.offset, textarea.value.length);
    const end = Math.min(selection.span.end.offset, textarea.value.length);
    textarea.focus();
    textarea.setSelectionRange(start, Math.max(start, end));
    onCursorChange({
      line: selection.span.start.line,
      column: selection.span.start.column,
    });
  }, [selection, onCursorChange]);

  return (
    <section className="editor-pane" aria-label="CloudMer Source Editor">
      <div className="pane-header">
        <h2>{documentLabel}</h2>
        <label className="editor-source-label" htmlFor="source">
          Source
        </label>
      </div>

      <div className="editor-body">
        <textarea
          ref={textareaRef}
          id="source"
          name="source"
          className="source-input"
          autoComplete="off"
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
