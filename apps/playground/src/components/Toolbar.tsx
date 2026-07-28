import type { ValidationMode } from "@cloudmer/model";
import type { ArchitectureExample } from "../examples.js";

interface ToolbarProps {
  status: string;
  isRendering: boolean;
  direction: "LR" | "RL" | "TB" | "BT";
  onDirectionChange: (dir: "LR" | "RL" | "TB" | "BT") => void;
  validation: ValidationMode;
  onValidationChange: (val: ValidationMode) => void;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  examples: ArchitectureExample[];
  onSelectExample: (example: ArchitectureExample) => void;
  onCopySvg: () => void;
  onDownloadSvg: () => void;
  copied: boolean;
}

export function Toolbar({
  status,
  isRendering,
  direction,
  onDirectionChange,
  validation,
  onValidationChange,
  theme,
  onThemeChange,
  examples,
  onSelectExample,
  onCopySvg,
  onDownloadSvg,
  copied,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="brand">
        <div className="logo-icon">CM</div>
        <div>
          <h1>CloudMer</h1>
          <p className="eyebrow">Cloud Architecture as Code</p>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label htmlFor="example-select">Example:</label>
          <select
            id="example-select"
            defaultValue=""
            onChange={(e) => {
              const ex = examples.find((x) => x.id === e.target.value);
              if (ex) onSelectExample(ex);
            }}
          >
            <option value="" disabled>
              Select Example...
            </option>
            {examples.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="direction-select">Layout:</label>
          <select
            id="direction-select"
            value={direction}
            onChange={(e) =>
              onDirectionChange(e.target.value as "LR" | "RL" | "TB" | "BT")
            }
          >
            <option value="LR">Left to Right (LR)</option>
            <option value="RL">Right to Left (RL)</option>
            <option value="TB">Top to Bottom (TB)</option>
            <option value="BT">Bottom to Top (BT)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="validation-select">Validation:</label>
          <select
            id="validation-select"
            value={validation}
            onChange={(e) =>
              onValidationChange(e.target.value as ValidationMode)
            }
          >
            <option value="normal">Normal (Default)</option>
            <option value="strict">Strict (Warnings = Errors)</option>
            <option value="off">Off (Disable Provider Pass)</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          title="Toggle Theme"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onCopySvg}
          title="Copy SVG to Clipboard"
        >
          {copied ? "✓ Copied!" : "📋 Copy SVG"}
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={onDownloadSvg}
          title="Download SVG Diagram"
        >
          ⬇️ Download
        </button>
      </div>

      <div className={`status-badge ${isRendering ? "rendering" : "ready"}`}>
        <span className="dot" />
        <span>{status}</span>
      </div>
    </header>
  );
}
