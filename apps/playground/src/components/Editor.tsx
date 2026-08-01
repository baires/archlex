import type { Diagnostic, SourceSpan } from "@cloudmer/model";
import { Editor as MonacoEditor, type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { registerCloudMerLanguage } from "../monaco/cloudmer-language.js";
import { registerCloudMerThemes } from "../monaco/cloudmer-theme.js";
import { registerCompletionProvider } from "../monaco/completions.js";
import { setDiagnosticMarkers } from "../monaco/diagnostics.js";
import { registerHoverProvider } from "../monaco/hover.js";

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
  theme?: "dark" | "light";
  diagnostics?: readonly Diagnostic[];
}

export function Editor({
  source,
  onSourceChange,
  documentLabel,
  onCursorChange,
  selection,
  theme = "dark",
  diagnostics = [],
}: EditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register CloudMer language
    registerCloudMerLanguage(monaco);

    // Register themes
    registerCloudMerThemes(monaco);

    // Register completion provider
    registerCompletionProvider(monaco);

    // Register hover provider
    registerHoverProvider(monaco);

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Set initial diagnostics
    const model = editor.getModel();
    if (model) {
      setDiagnosticMarkers(monaco, model, diagnostics);
    }

    // Mark as ready
    setIsReady(true);
  };

  // Update theme when it changes
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !isReady) return;

    const monacoTheme = theme === "dark" ? "cloudmer-dark" : "cloudmer-light";
    monaco.editor.setTheme(monacoTheme);
  }, [theme, isReady]);

  // Update diagnostics when they change
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (model) {
      setDiagnosticMarkers(monaco, model, diagnostics);
    }
  }, [diagnostics]);

  // Handle selection changes from diagnostics
  useEffect(() => {
    if (!selection) return;
    const editor = editorRef.current;
    if (!editor) return;

    const { span } = selection;
    editor.setSelection({
      startLineNumber: span.start.line,
      startColumn: span.start.column,
      endLineNumber: span.end.line,
      endColumn: span.end.column,
    });
    editor.revealLineInCenter(span.start.line);
    editor.focus();
  }, [selection]);

  return (
    <section className="editor-pane" aria-label="CloudMer Source Editor">
      <div className="pane-header">
        <h2>{documentLabel}</h2>
        <label className="editor-source-label" htmlFor="source">
          Source
        </label>
      </div>

      <div className="editor-body">
        <MonacoEditor
          language="cloudmer"
          theme={theme === "dark" ? "cloudmer-dark" : "cloudmer-light"}
          value={source}
          onChange={(value: string | undefined) => onSourceChange(value || "")}
          onMount={handleEditorDidMount}
          loading={<div className="editor-loading">Loading editor...</div>}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 23,
            fontFamily: "IBM Plex Mono, monospace",
            fontLigatures: true,
            tabSize: 2,
            insertSpaces: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            suggest: {
              showKeywords: true,
              showSnippets: false,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            wordWrap: "off",
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </section>
  );
}
