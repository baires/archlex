import type { ValidationMode } from "@cloudmer/model";
import type { ArchitectureExample } from "../examples.js";
import { ExportMenu } from "./ExportMenu.js";
import { Icon } from "./Icon.js";

interface CommandBarProps {
  direction: "LR" | "RL" | "TB" | "BT";
  validation: ValidationMode;
  theme: "dark" | "light";
  examples: readonly ArchitectureExample[];
  canExport: boolean;
  onDirectionChange: (value: "LR" | "RL" | "TB" | "BT") => void;
  onValidationChange: (value: ValidationMode) => void;
  onThemeChange: (value: "dark" | "light") => void;
  onSelectExample: (example: ArchitectureExample) => void;
  onCopySvg: () => Promise<void>;
  onDownloadSvg: () => void;
  onEnterFullscreen: () => void;
}

export function CommandBar({
  direction,
  validation,
  theme,
  examples,
  canExport,
  onDirectionChange,
  onValidationChange,
  onThemeChange,
  onSelectExample,
  onCopySvg,
  onDownloadSvg,
  onEnterFullscreen,
}: CommandBarProps) {
  return (
    <header className="command-bar">
      <div className="command-bar-brand">
        <span className="wordmark" aria-hidden="true">
          CLOUDMER
        </span>
        <h1 className="visually-hidden">CloudMer</h1>
      </div>

      <div className="command-bar-controls">
        <div className="control-group">
          <label htmlFor="example-select">Example</label>
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

        <div className="control-group">
          <label htmlFor="direction-select">Layout direction</label>
          <select
            id="direction-select"
            value={direction}
            onChange={(event) =>
              onDirectionChange(event.target.value as "LR" | "RL" | "TB" | "BT")
            }
          >
            <option value="LR">Left to right</option>
            <option value="RL">Right to left</option>
            <option value="TB">Top to bottom</option>
            <option value="BT">Bottom to top</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="validation-select">Validation mode</label>
          <select
            id="validation-select"
            value={validation}
            onChange={(event) =>
              onValidationChange(event.target.value as ValidationMode)
            }
          >
            <option value="normal">Normal</option>
            <option value="strict">Strict</option>
            <option value="off">Off</option>
          </select>
        </div>
      </div>

      <div className="command-bar-actions">
        <button
          type="button"
          className="btn-secondary icon-button"
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <ExportMenu
          disabled={!canExport}
          onCopySvg={onCopySvg}
          onDownloadSvg={onDownloadSvg}
        />
        <button
          type="button"
          className="btn-secondary icon-button"
          aria-label="Enter fullscreen"
          title="Enter fullscreen"
          onClick={onEnterFullscreen}
        >
          <Icon name="enter-fullscreen" />
        </button>
      </div>
    </header>
  );
}
