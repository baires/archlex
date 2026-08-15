import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { gcpProvider } from "@archlex/gcp";
import { k8sProvider } from "@archlex/k8s";
import type { Diagnostic, RenderResult, ValidationMode } from "@archlex/model";
import { useEffect, useRef, useState } from "react";
import { CommandBar } from "./components/CommandBar.js";
import {
  type DiagnosticFilter,
  DiagnosticsDrawer,
} from "./components/DiagnosticsDrawer.js";
import { Editor, type EditorSelection } from "./components/Editor.js";
import { Preview } from "./components/Preview.js";
import { StatusBar } from "./components/StatusBar.js";
import { URLImportModal } from "./components/URLImportModal.js";
import { Workspace, useWorkspaceFullscreen } from "./components/Workspace.js";
import {
  type RenderIssue,
  createRenderIssue,
  summarizeStatusDiagnostics,
} from "./components/diagnostics-state.js";
import {
  DEFAULT_SPLIT_RATIO,
  clampSplitRatio,
  shouldAutoOpenDiagnostics,
} from "./components/workspace-state.js";
import { ARCHITECTURE_EXAMPLES, type ArchitectureExample } from "./examples.js";
import { iconLoader } from "./icon-loader.js";
import {
  type RenderWithIconsResult,
  createGuardedOperationHandlers,
  renderProgressively,
} from "./render-pipeline.js";
import { downloadDataUrl, svgToPng } from "./utils/export.js";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
});

const catalogMetadata = archlex.getCatalog();

const STORAGE_SOURCE_KEY = "archlex_source_v1";
const STORAGE_OPTIONS_KEY = "archlex_options_v1";

function providerFromSource(source: string): "aws" | "gcp" | "k8s" | "unknown" {
  const provider = /^provider\s+(aws|gcp|k8s)\s*$/m.exec(source)?.[1];
  return provider === "aws" || provider === "gcp" || provider === "k8s"
    ? provider
    : "unknown";
}

export type OperationMessage = {
  tone: "success" | "error";
  text: string;
} | null;

function loadPersistedSource(): string {
  try {
    const saved = localStorage.getItem(STORAGE_SOURCE_KEY);
    if (saved && saved.trim().length > 0) return saved;
  } catch {
    // LocalStorage corrupted or disabled fallback
  }
  return ARCHITECTURE_EXAMPLES[0].source;
}

interface PersistedOptions {
  direction: "LR" | "RL" | "TB" | "BT";
  validation: ValidationMode;
  theme: "dark" | "light";
  splitRatio: number;
}

function loadPersistedOptions(): PersistedOptions {
  try {
    const saved = localStorage.getItem(STORAGE_OPTIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        direction: parsed.direction ?? "LR",
        validation: parsed.validation ?? "normal",
        theme: parsed.theme ?? "dark",
        splitRatio: clampSplitRatio(parsed.splitRatio),
      };
    }
  } catch {
    // Corruption fallback
  }
  return {
    direction: "LR",
    validation: "normal",
    theme: "dark",
    splitRatio: DEFAULT_SPLIT_RATIO,
  };
}

export function App() {
  const initialOptions = loadPersistedOptions();

  const [source, setSource] = useState(loadPersistedSource);
  const [direction, setDirection] = useState<"LR" | "RL" | "TB" | "BT">(
    initialOptions.direction,
  );
  const [validation, setValidation] = useState<ValidationMode>(
    initialOptions.validation,
  );
  const [theme, setTheme] = useState<"dark" | "light">(initialOptions.theme);
  const [splitRatio, setSplitRatio] = useState(initialOptions.splitRatio);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [diagnosticFilter, setDiagnosticFilter] =
    useState<DiagnosticFilter>("all");
  const [editorSelection, setEditorSelection] =
    useState<EditorSelection | null>(null);

  const [currentSvg, setCurrentSvg] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<readonly Diagnostic[]>([]);
  const [renderIssue, setRenderIssue] = useState<RenderIssue | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isLoadingIcons, setIsLoadingIcons] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] =
    useState<OperationMessage>(null);
  const [renderDurationMs, setRenderDurationMs] = useState<number | null>(null);
  const [isUrlImportOpen, setIsUrlImportOpen] = useState(false);
  const renderStartedAtRef = useRef(0);
  const previousSummaryRef = useRef(summarizeStatusDiagnostics([], null));
  const lastSuccessfulDiagnosticsRef = useRef<readonly Diagnostic[]>([]);
  const selectionRequestRef = useRef(0);
  const renderOperationIdRef = useRef(0);
  const diagnosticsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fullscreen = useWorkspaceFullscreen();

  // 1. Persist to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SOURCE_KEY, source);
    } catch {
      // Ignore storage error
    }
  }, [source]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_OPTIONS_KEY,
        JSON.stringify({ direction, validation, theme, splitRatio }),
      );
    } catch {
      // Ignore storage error
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [direction, validation, theme, splitRatio]);

  // 2. 150ms Debounced Render Pipeline
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const operationId = ++renderOperationIdRef.current;
    let operationController: AbortController | null = null;
    setIsRendering(true);
    setIsLoadingIcons(false);

    const timeoutId = setTimeout(() => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      operationController = controller;
      activeControllerRef.current = controller;

      renderStartedAtRef.current = performance.now();

      const operation = renderProgressively(archlex, iconLoader, source, {
        direction,
        validation,
        theme,
        signal: controller.signal,
      });
      setIsLoadingIcons(operation.hydrated !== null);

      const baseHandlers = createGuardedOperationHandlers<RenderResult>({
        operationId,
        currentOperationId: () => renderOperationIdRef.current,
        signal: controller.signal,
        onSuccess: (renderResult) => {
          const nextSummary = summarizeStatusDiagnostics(
            renderResult.diagnostics,
            null,
          );
          if (
            shouldAutoOpenDiagnostics(previousSummaryRef.current, nextSummary)
          ) {
            setDiagnosticFilter("error");
            setIsDiagnosticsOpen(true);
          }
          previousSummaryRef.current = nextSummary;
          lastSuccessfulDiagnosticsRef.current = renderResult.diagnostics;

          // Sync theme toggle to source directive when source changes
          const themeDirective = renderResult.ast.statements.find(
            (s) => s.type === "directive" && "name" in s && s.name === "theme",
          );
          if (themeDirective && "value" in themeDirective) {
            const directiveValue = themeDirective.value as string;
            if (
              (directiveValue === "light" || directiveValue === "dark") &&
              directiveValue !== theme
            ) {
              setTheme(directiveValue);
            }
          }

          setCurrentSvg(renderResult.svg);
          setDiagnostics(renderResult.diagnostics);
          setRenderIssue(null);
          setRenderDurationMs(
            Math.round(performance.now() - renderStartedAtRef.current),
          );
          setIsRendering(false);
        },
        onFailure: (error: unknown) => {
          const issue = createRenderIssue(error);
          const nextSummary = summarizeStatusDiagnostics(
            lastSuccessfulDiagnosticsRef.current,
            issue,
          );
          if (
            shouldAutoOpenDiagnostics(previousSummaryRef.current, nextSummary)
          ) {
            setDiagnosticFilter("error");
            setIsDiagnosticsOpen(true);
          }
          previousSummaryRef.current = nextSummary;
          setRenderIssue(issue);
          setIsRendering(false);
          setIsLoadingIcons(false);
          controller.abort();
        },
      });

      const hydrationHandlers =
        createGuardedOperationHandlers<RenderWithIconsResult>({
          operationId,
          currentOperationId: () => renderOperationIdRef.current,
          signal: controller.signal,
          onSuccess: ({ renderResult }) => {
            setCurrentSvg(renderResult.svg);
            setIsLoadingIcons(false);
          },
          onFailure: () => {
            setIsLoadingIcons(false);
          },
        });

      operation.base.then(baseHandlers.onSuccess).catch(baseHandlers.onFailure);
      operation.hydrated
        ?.then(hydrationHandlers.onSuccess)
        .catch(hydrationHandlers.onFailure);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      operationController?.abort();
      if (activeControllerRef.current === operationController) {
        activeControllerRef.current = null;
      }
    };
  }, [source, direction, validation, theme]);

  useEffect(() => {
    if (!operationMessage) return;
    const timeoutId = window.setTimeout(() => setOperationMessage(null), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [operationMessage]);

  // Actions
  const handleSelectExample = (example: ArchitectureExample) => {
    setSource(example.source);
    setSelectedId(null);
    setEditorSelection(null);
  };

  const handleImportFile = (content: string, filename: string) => {
    setSource(content);
    setSelectedId(null);
    setEditorSelection(null);
    setOperationMessage({
      tone: "success",
      text: `Imported ${filename}`,
    });
  };

  const handleImportFromUrl = (content: string) => {
    setSource(content);
    setSelectedId(null);
    setEditorSelection(null);
    setOperationMessage({
      tone: "success",
      text: "Imported from URL",
    });
  };

  const handleCopySvg = async () => {
    if (!currentSvg) return;
    try {
      await navigator.clipboard.writeText(currentSvg);
      setOperationMessage({ tone: "success", text: "SVG copied" });
    } catch {
      setOperationMessage({ tone: "error", text: "Copy failed" });
    }
  };

  const handleDownloadSvg = () => {
    if (!currentSvg) return;
    let url: string | null = null;
    try {
      const blob = new Blob([currentSvg], {
        type: "image/svg+xml;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "archlex-diagram.svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setOperationMessage({ tone: "success", text: "SVG downloaded" });
    } catch {
      setOperationMessage({ tone: "error", text: "Download failed" });
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const handleDownloadPng = async () => {
    if (!currentSvg) return;
    try {
      const pngDataUrl = await svgToPng(currentSvg, 2);
      downloadDataUrl(pngDataUrl, "archlex-diagram.png");
      setOperationMessage({ tone: "success", text: "PNG downloaded" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "PNG export failed";
      setOperationMessage({ tone: "error", text: message });
    }
  };

  const handleOpenDiagnostics = (filter: DiagnosticFilter) => {
    const activeElement = document.activeElement;
    diagnosticsTriggerRef.current =
      activeElement instanceof HTMLButtonElement ? activeElement : null;
    setDiagnosticFilter(filter);
    setIsDiagnosticsOpen(true);
  };

  const handleSelectDiagnostic = (diagnostic: Diagnostic) => {
    selectionRequestRef.current += 1;
    setSelectedId(diagnostic.elements[0] ?? null);
    setEditorSelection({
      span: diagnostic.span,
      requestId: selectionRequestRef.current,
    });
  };

  const summary = summarizeStatusDiagnostics(diagnostics, renderIssue);
  const provider = providerFromSource(source);

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <CommandBar
        direction={direction}
        validation={validation}
        theme={theme}
        examples={ARCHITECTURE_EXAMPLES}
        canExport={Boolean(currentSvg)}
        isFullscreen={fullscreen.isFullscreen}
        onDirectionChange={setDirection}
        onValidationChange={setValidation}
        onThemeChange={setTheme}
        onSelectExample={handleSelectExample}
        onImportFile={handleImportFile}
        onOpenUrlImport={() => setIsUrlImportOpen(true)}
        onCopySvg={handleCopySvg}
        onDownloadSvg={handleDownloadSvg}
        onDownloadPng={handleDownloadPng}
        onEnterFullscreen={() => void fullscreen.enterFullscreen()}
      />

      {isUrlImportOpen ? (
        <URLImportModal
          onImport={handleImportFromUrl}
          onClose={() => setIsUrlImportOpen(false)}
        />
      ) : null}

      <Workspace
        workspaceRef={fullscreen.workspaceRef}
        splitRatio={splitRatio}
        onSplitRatioChange={setSplitRatio}
        editor={
          <Editor
            source={source}
            onSourceChange={setSource}
            documentLabel="architecture.archlex"
            onCursorChange={setCursor}
            selection={editorSelection}
            theme={theme}
            diagnostics={diagnostics}
            catalog={catalogMetadata}
          />
        }
        preview={
          <Preview
            svg={currentSvg}
            isRendering={isRendering}
            selectedId={selectedId}
            isFullscreen={fullscreen.isFullscreen}
            onSelectElement={setSelectedId}
            onExitFullscreen={() => void fullscreen.exitFullscreen()}
          />
        }
        diagnosticsDrawer={
          isDiagnosticsOpen ? (
            <DiagnosticsDrawer
              diagnostics={diagnostics}
              renderIssue={renderIssue}
              filter={diagnosticFilter}
              selectedId={selectedId}
              triggerRef={diagnosticsTriggerRef}
              onFilterChange={setDiagnosticFilter}
              onSelectDiagnostic={handleSelectDiagnostic}
              onClose={() => setIsDiagnosticsOpen(false)}
            />
          ) : null
        }
        statusBar={
          <StatusBar
            provider={provider}
            cursor={cursor}
            summary={summary}
            activeFilter={diagnosticFilter}
            isRendering={isRendering}
            isLoadingIcons={isLoadingIcons}
            renderDurationMs={renderDurationMs}
            operationMessage={operationMessage}
            onOpenDiagnostics={handleOpenDiagnostics}
          />
        }
        isFullscreen={fullscreen.isFullscreen}
        fullscreenMode={fullscreen.mode}
      />
    </div>
  );
}
