import { awsProvider, createCloudMer, gcpProvider } from "@cloudmer/core";
import type { Diagnostic, ValidationMode } from "@cloudmer/model";
import { useEffect, useRef, useState } from "react";
import { Diagnostics } from "./components/Diagnostics.js";
import { Editor } from "./components/Editor.js";
import { Preview } from "./components/Preview.js";
import { Toolbar } from "./components/Toolbar.js";
import { ARCHITECTURE_EXAMPLES, type ArchitectureExample } from "./examples.js";

const cloudmer = createCloudMer({ providers: [awsProvider(), gcpProvider()] });

const STORAGE_SOURCE_KEY = "cloudmer_source_v1";
const STORAGE_OPTIONS_KEY = "cloudmer_options_v1";

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
      };
    }
  } catch {
    // Corruption fallback
  }
  return { direction: "LR", validation: "normal", theme: "dark" };
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

  const [currentSvg, setCurrentSvg] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<readonly Diagnostic[]>([]);
  const [status, setStatus] = useState<string>("Ready");
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

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
        JSON.stringify({ direction, validation, theme }),
      );
    } catch {
      // Ignore storage error
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [direction, validation, theme]);

  // 2. 150ms Debounced Render Pipeline
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsRendering(true);
    setStatus("Rendering...");

    const timeoutId = setTimeout(() => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;

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
          setStatus("Ready");
          setIsRendering(false);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setStatus(error instanceof Error ? error.message : "Render error");
          setIsRendering(false);
        });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [source, direction, validation, theme]);

  // Actions
  const handleSelectExample = (example: ArchitectureExample) => {
    setSource(example.source);
    setSelectedId(null);
  };

  const handleCopySvg = () => {
    if (!currentSvg) return;
    navigator.clipboard.writeText(currentSvg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadSvg = () => {
    if (!currentSvg) return;
    const blob = new Blob([currentSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cloudmer-diagram.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <Toolbar
        status={status}
        isRendering={isRendering}
        direction={direction}
        onDirectionChange={setDirection}
        validation={validation}
        onValidationChange={setValidation}
        theme={theme}
        onThemeChange={setTheme}
        examples={ARCHITECTURE_EXAMPLES}
        onSelectExample={handleSelectExample}
        onCopySvg={handleCopySvg}
        onDownloadSvg={handleDownloadSvg}
        copied={copied}
      />

      <main className="workspace-grid">
        <Editor
          source={source}
          onSourceChange={setSource}
          diagnostics={diagnostics}
        />

        <Preview
          svg={currentSvg}
          isRendering={isRendering}
          selectedId={selectedId}
          onSelectElement={setSelectedId}
        />

        <Diagnostics
          diagnostics={diagnostics}
          selectedId={selectedId}
          onSelectDiagnostic={(id) => setSelectedId(id)}
        />
      </main>
    </div>
  );
}
