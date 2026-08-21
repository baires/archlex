import type { ValidationMode } from "@archlex/model";
import {
  type ArchitectureExample,
  EXAMPLE_PROVIDERS,
  EXAMPLE_PROVIDER_LABELS,
  EXAMPLE_USE_CASES,
} from "../examples.js";
import { DiagramSettings } from "./DiagramSettings.js";
import { ExportMenu } from "./ExportMenu.js";
import { Icon } from "./Icon.js";
import { ImportMenu } from "./ImportMenu.js";

interface CommandBarProps {
  direction: "LR" | "RL" | "TB" | "BT";
  validation: ValidationMode;
  theme: "dark" | "light";
  examples: readonly ArchitectureExample[];
  canExport: boolean;
  isFullscreen: boolean;
  onDirectionChange: (value: "LR" | "RL" | "TB" | "BT") => void;
  onValidationChange: (value: ValidationMode) => void;
  onThemeChange: (value: "dark" | "light") => void;
  onSelectExample: (example: ArchitectureExample) => void;
  onImportFile: (content: string, filename: string) => void;
  onOpenUrlImport: () => void;
  onCopySvg: () => Promise<void>;
  onDownloadSvg: () => void;
  onDownloadPng: () => Promise<void>;
  onEnterFullscreen: () => void;
}

export function CommandBar({
  direction,
  validation,
  theme,
  examples,
  canExport,
  isFullscreen,
  onDirectionChange,
  onValidationChange,
  onThemeChange,
  onSelectExample,
  onImportFile,
  onOpenUrlImport,
  onCopySvg,
  onDownloadSvg,
  onDownloadPng,
  onEnterFullscreen,
}: CommandBarProps) {
  const docsUrl = import.meta.env.VITE_DOCS_URL || "https://docs.archlex.dev";
  const githubUrl = "https://github.com/baires/archlex";

  return (
    <header className="command-bar" hidden={isFullscreen}>
      <div className="command-bar-brand">
        <span className="wordmark">
          <svg
            className="wordmark__mark"
            viewBox="14 61 88 88"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M 86.7,93.1 C 85.4,84.5 79.6,76.2 70.5,71.4 c -2.855177,-4.354438 -8.138641,-4.429748 -13,-4.5 -5.053512,-0.118193 -9.009045,0.21206 -12,4.2 -5.5,2.2 -14.8,9.3 -16.9,21.9 -2.4,0.5 -3.9,2.7 -3.5,5.1 0.519896,2.87816 2.933,3.51237 5.3,4.4 -1.7,2.9 -3.5,7 -3.5,12.3 0,7.8 4.6,17.1 15.7,21.7 5.079063,1.90625 10.208987,3.74091 15.1,6.1 4.277973,-1.84914 8.619879,-3.5157 13,-5.1 10.7,-3.5 17.7,-11.2 17.9,-21.9 0,-4.7 -1.5,-8.8 -3.4,-12.3 2.536021,-0.67335 4.287506,-1.67995 4.9,-4.4 0.2,-2.3 -1.2,-5.1 -3.4,-5.4 z m -15.3,37.8 c -4.617675,1.71185 -9.15043,3.61036 -13.7,5.5 -4.404154,-2.08237 -9.147792,-3.35518 -13.6,-5.3 C 39.3,129 33,124.2 32.8,116 c -0.1,-4.5 1.4,-7.7 3.6,-11.2 3.6,0.8 8.3,1.6 15.2,2 1.1,0.8 4,3.5 6.1,7.3 1.8,-3.4 4.7,-6.2 6.1,-7.3 4.1,-0.2 9.6,-0.7 15.4,-2 1.9,2.8 3.5,6.3 3.4,10.4 -0.2,6.3 -4.1,12.7 -11.2,15.7 z M 57.3,101.1 c -6.7,0 -13.3,-0.5 -16.7,-1 -2.2,-0.3 -6.6,-1.3 -6.6,-2 0.4,-11.1 6,-17 12.4,-20.7 1,4.2 1.9,9 1.9,14.2 h 5.4 c 0,-7 -1.8,-15.6 -2.3,-18 1.2,-0.4 3.5,-0.8 6.1,-0.8 2.6,0 4.4,0.3 6.3,0.7 -1,4.5 -2.2,11 -2.3,18.1 h 5.6 c 0,-5 0.8,-10.2 1.9,-14.2 8.314386,4.091076 12.040981,11.871286 12.8,20.6 -8.007329,2.35704 -16.188486,3.04966 -24.5,3.1 z" />
            <path d="m 45.4,109.4 c -3,0 -5.8,2.3 -5.9,5.5 0,3.1 2.3,5.8 5.5,5.7 3,0.1 5.8,-2.2 5.8,-5.6 0,-3 -2.395566,-5.50198 -5.395566,-5.60198 z m 2.1,4.4 c -0.8,0 -1.4,-0.6 -1.4,-1.4 0,-0.8 0.6,-1.4 1.4,-1.4 0.8,0 1.4,0.6 1.4,1.4 0,0.8 -0.6,1.3 -1.4,1.4 z" />
            <path d="m 72.2,109.6 c -2.8,-1 -6.6,0.5 -7.5,3.8 -0.8,3.1 1.2,6.4 4.6,7 3.1,0.4 6.2,-1.5 6.5,-4.9 0.3,-2.9 -1.5,-5.1 -3.6,-5.9 z m 0,4.1 c -0.7,0 -1.4,-0.6 -1.4,-1.4 0,-0.8 0.6,-1.4 1.4,-1.4 0.8,0 1.4,0.7 1.4,1.5 0,0.7 -0.7,1.3 -1.4,1.3 z" />
            <path d="m 53.1,121.5 4.5,7.5 4.5,-7.4 -4.4,-5.1 z" />
          </svg>
          <span className="wordmark-text" aria-hidden="true">
            ARCHLEX
          </span>
        </span>
        <h1 className="visually-hidden">ArchLex</h1>
      </div>

      <div className="command-bar-context">
        <div className="control-group">
          <label className="example-label" htmlFor="example-select">
            Example
          </label>
          <select
            id="example-select"
            defaultValue=""
            onChange={(event) => {
              const example = examples.find(
                (candidate) => candidate.id === event.target.value,
              );
              if (example) onSelectExample(example);
            }}
          >
            <option value="" disabled>
              Select example…
            </option>
            {EXAMPLE_PROVIDERS.map((provider) => {
              const providerExamples = examples
                .filter((example) => example.provider === provider)
                .sort(
                  (left, right) =>
                    EXAMPLE_USE_CASES.indexOf(left.useCase) -
                    EXAMPLE_USE_CASES.indexOf(right.useCase),
                );

              if (providerExamples.length === 0) return null;

              return (
                <optgroup
                  key={provider}
                  label={EXAMPLE_PROVIDER_LABELS[provider]}
                >
                  {providerExamples.map((example) => (
                    <option key={example.id} value={example.id}>
                      {example.useCase} · {example.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      <div className="command-bar-actions">
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary docs-link"
          aria-label="Open documentation in a new tab"
          title="Documentation"
        >
          <Icon name="book" />
          <span className="btn-label">Docs</span>
        </a>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary icon-button"
          aria-label="ArchLex on GitHub"
          title="GitHub Repository"
        >
          <Icon name="github" />
        </a>
        <DiagramSettings
          direction={direction}
          validation={validation}
          onDirectionChange={onDirectionChange}
          onValidationChange={onValidationChange}
        />
        <button
          type="button"
          className="btn-secondary icon-button"
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <ImportMenu
          onImportFile={onImportFile}
          onOpenUrlImport={onOpenUrlImport}
        />
        <ExportMenu
          disabled={!canExport}
          onCopySvg={onCopySvg}
          onDownloadSvg={onDownloadSvg}
          onDownloadPng={onDownloadPng}
        />
        <button
          type="button"
          className="btn-secondary icon-button"
          aria-label="Enter fullscreen preview"
          title="Enter fullscreen preview"
          onClick={onEnterFullscreen}
        >
          <Icon name="enter-fullscreen" />
        </button>
      </div>
    </header>
  );
}
