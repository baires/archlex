import type { ValidationMode } from "@archlex/model";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";

interface DiagramSettingsProps {
  direction: "LR" | "RL" | "TB" | "BT";
  validation: ValidationMode;
  onDirectionChange: (value: "LR" | "RL" | "TB" | "BT") => void;
  onValidationChange: (value: ValidationMode) => void;
}

export function DiagramSettings({
  direction,
  validation,
  onDirectionChange,
  onValidationChange,
}: DiagramSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="diagram-settings" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary settings-trigger"
        aria-label="Diagram settings"
        aria-expanded={isOpen}
        aria-controls="diagram-settings-popover"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Icon name="settings" />
        <span>Settings</span>
      </button>
      {isOpen ? (
        <div id="diagram-settings-popover" className="settings-popover">
          <div className="settings-field">
            <label htmlFor="direction-select">Layout direction</label>
            <p id="direction-description">Choose how the diagram flows.</p>
            <select
              id="direction-select"
              value={direction}
              aria-describedby="direction-description"
              onChange={(event) =>
                onDirectionChange(
                  event.target.value as "LR" | "RL" | "TB" | "BT",
                )
              }
            >
              <option value="LR">Left to right</option>
              <option value="RL">Right to left</option>
              <option value="TB">Top to bottom</option>
              <option value="BT">Bottom to top</option>
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="validation-select">Validation mode</label>
            <p id="validation-description">
              Choose how strictly source is checked.
            </p>
            <select
              id="validation-select"
              value={validation}
              aria-describedby="validation-description"
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
      ) : null}
    </div>
  );
}
