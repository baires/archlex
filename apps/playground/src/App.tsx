import { awsProvider, createCloudMer, gcpProvider } from "@cloudmer/core";
import type { Diagnostic, ValidationMode } from "@cloudmer/model";
import { useEffect, useRef, useState } from "react";
import { CommandBar } from "./components/CommandBar.js";
import { Diagnostics } from "./components/Diagnostics.js";
import { Editor } from "./components/Editor.js";
import { Preview } from "./components/Preview.js";
import { Workspace } from "./components/Workspace.js";
import {
  DEFAULT_SPLIT_RATIO,
  clampSplitRatio,
} from "./components/workspace-state.js";
import { ARCHITECTURE_EXAMPLES, type ArchitectureExample } from "./examples.js";

const cloudmer = createCloudMer({ providers: [awsProvider(), gcpProvider()] });

const STORAGE_SOURCE_KEY = "cloudmer_source_v1";
const STORAGE_OPTIONS_KEY = "cloudmer_options_v1";

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [currentSvg, setCurrentSvg] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<readonly Diagnostic[]>([]);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] =
    useState<OperationMessage>(null);
  const [renderDurationMs, setRenderDurationMs] = useState<number | null>(null);
  const renderStartedAtRef = useRef(0);

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

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  // 2. 150ms Debounced Render Pipeline
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsRendering(true);

    const timeoutId = setTimeout(() => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;

      renderStartedAtRef.current = performance.now();
      cloudmer
        .render(source, {
          direction,
          validation,
          theme,
          signal: controller.signal,
        })
        .then((result) => {
          if (controller.signal.aborted) return;
          setCurrentSvg(result.svg);
          setDiagnostics(result.diagnostics);
          setRenderDurationMs(
            Math.round(performance.now() - renderStartedAtRef.current),
          );
          setIsRendering(false);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setOperationMessage({
            tone: "error",
            text: error instanceof Error ? error.message : "Render error",
          });
          setIsRendering(false);
        });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
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
      link.download = "cloudmer-diagram.svg";
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

  const handleEnterFullscreen = () => {
    if (!document.documentElement.requestFullscreen) return;
    void document.documentElement.requestFullscreen().catch(() => {
      setOperationMessage({ tone: "error", text: "Fullscreen unavailable" });
    });
  };

  const renderStatus = operationMessage?.text
    ? operationMessage.text
    : isRendering
      ? "Rendering…"
      : renderDurationMs === null
        ? "Ready"
        : `Ready · rendered in ${renderDurationMs} ms`;

  return (
    <div className="app-shell" data-theme={theme}>
      <CommandBar
        direction={direction}
        validation={validation}
        theme={theme}
        examples={ARCHITECTURE_EXAMPLES}
        canExport={Boolean(currentSvg)}
        onDirectionChange={setDirection}
        onValidationChange={setValidation}
        onThemeChange={setTheme}
        onSelectExample={handleSelectExample}
        onCopySvg={handleCopySvg}
        onDownloadSvg={handleDownloadSvg}
        onEnterFullscreen={handleEnterFullscreen}
      />

      <Workspace
        splitRatio={splitRatio}
        onSplitRatioChange={setSplitRatio}
        editor={
          <Editor
            source={source}
            onSourceChange={setSource}
            documentLabel="architecture.cloudmer"
            onCursorChange={setCursor}
          />
        }
        preview={
          <Preview
            svg={currentSvg}
            isRendering={isRendering}
            selectedId={selectedId}
            onSelectElement={setSelectedId}
          />
        }
        diagnosticsDrawer={
          <Diagnostics
            diagnostics={diagnostics}
            selectedId={selectedId}
            onSelectDiagnostic={(id) => setSelectedId(id)}
          />
        }
        statusBar={
          <output
            className={`render-metadata status-badge workspace-status-bar ${
              operationMessage?.tone ?? (isRendering ? "rendering" : "ready")
            }`}
            aria-live="polite"
          >
            {renderStatus} · Ln {cursor.line}, Col {cursor.column}
          </output>
        }
        isFullscreen={isFullscreen}
      />
    </div>
  );
}
