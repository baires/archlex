import type { CatalogMetadata, Diagnostic, SourceSpan } from "@archlex/model";
import { Editor as MonacoEditor, type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { registerArchLexLanguage } from "../monaco/archlex-language.js";
import { registerArchLexThemes } from "../monaco/archlex-theme.js";
import { registerCodeActionsProvider } from "../monaco/code-actions.js";
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
  catalog: CatalogMetadata;
}

export function Editor({
  source,
  onSourceChange,
  documentLabel,
  onCursorChange,
  selection,
  theme = "dark",
  diagnostics = [],
  catalog,
}: EditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const hoverDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const codeActionsDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const completionDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register ArchLex language
    registerArchLexLanguage(monaco);

    // Register themes
    registerArchLexThemes(monaco);

    // Register completion provider with catalog
    completionDisposableRef.current = registerCompletionProvider(
      monaco,
      catalog,
    );

    // Register hover provider with diagnostics
    hoverDisposableRef.current = registerHoverProvider(monaco, diagnostics);

    // Register code actions provider
    codeActionsDisposableRef.current = registerCodeActionsProvider(
      monaco,
      diagnostics,
    );

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

    const monacoTheme = theme === "dark" ? "archlex-dark" : "archlex-light";
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

      // Update hover provider
      if (hoverDisposableRef.current) {
        hoverDisposableRef.current.dispose();
      }
      hoverDisposableRef.current = registerHoverProvider(monaco, diagnostics);

      // Update code actions
      if (codeActionsDisposableRef.current) {
        codeActionsDisposableRef.current.dispose();
      }
      codeActionsDisposableRef.current = registerCodeActionsProvider(
        monaco,
        diagnostics,
      );
    }

    return () => {
      if (hoverDisposableRef.current) {
        hoverDisposableRef.current.dispose();
      }
      if (codeActionsDisposableRef.current) {
        codeActionsDisposableRef.current.dispose();
      }
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose();
      }
    };
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
    <section
      className="editor-pane"
      aria-label="ArchLex Source Editor"
      data-test-source={source}
    >
      <div className="pane-header">
        <h2>{documentLabel}</h2>
        <label className="editor-source-label" htmlFor="source">
          Source
        </label>
      </div>

      <div className="editor-body">
        <MonacoEditor
          language="archlex"
          theme={theme === "dark" ? "archlex-dark" : "archlex-light"}
          value={source}
          onChange={(value: string | undefined) => onSourceChange(value || "")}
          onMount={handleEditorDidMount}
          loading={<div className="editor-loading">Loading editor...</div>}
          options={{
            ariaLabel: "Source",
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
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: false,
            },
          }}
        />
      </div>
    </section>
  );
}
