import type { ValidationMode } from "@archlex/model";
import type { ArchitectureExample } from "../examples.js";
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
  return (
    <header className="command-bar" hidden={isFullscreen}>
      <div className="command-bar-brand">
        <span className="wordmark" aria-hidden="true">
          ARCHLEX
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
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="command-bar-actions">
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
