import type { Diagnostic } from "@cloudmer/model";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from "react";
import { useState } from "react";

export type DiagnosticFilter = "all" | Diagnostic["severity"];

interface DiagnosticsDrawerProps {
  diagnostics: readonly Diagnostic[];
  filter: DiagnosticFilter;
  selectedId: string | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onFilterChange: (filter: DiagnosticFilter) => void;
  onSelectDiagnostic: (diagnostic: Diagnostic) => void;
  onClose: () => void;
}

const filters: readonly DiagnosticFilter[] = [
  "all",
  "error",
  "warning",
  "info",
];

function labelForFilter(filter: DiagnosticFilter): string {
  return filter === "all"
    ? "All"
    : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`;
}

function diagnosticKey(diagnostic: Diagnostic, index: number): string {
  return `${diagnostic.code}-${diagnostic.span.start.offset}-${index}`;
}

export function DiagnosticsDrawer({
  diagnostics,
  filter,
  selectedId,
  triggerRef,
  onFilterChange,
  onSelectDiagnostic,
  onClose,
}: DiagnosticsDrawerProps) {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const visibleDiagnostics =
    filter === "all"
      ? diagnostics
      : diagnostics.filter((diagnostic) => diagnostic.severity === filter);

  const closeAndRestoreFocus = () => {
    onClose();
    triggerRef.current?.focus();
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeAndRestoreFocus();
  };

  const handleListboxKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[role='option']"),
    );
    const activeIndex = options.indexOf(document.activeElement as HTMLElement);
    if (activeIndex < 0 || options.length === 0) return;
    event.preventDefault();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    options[(activeIndex + offset + options.length) % options.length]?.focus();
  };

  const toggleRemediation = (
    event: ReactMouseEvent<HTMLButtonElement>,
    key: string,
  ) => {
    event.stopPropagation();
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <dialog
      open
      className="diagnostics-drawer"
      aria-label="Diagnostics"
      aria-modal="false"
      onKeyDown={handleDialogKeyDown}
    >
      <header className="diagnostics-drawer-header">
        <h2>Diagnostics</h2>
        <div className="diagnostic-filters" aria-label="Diagnostic filters">
          {filters.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={filter === candidate}
              onClick={() => onFilterChange(candidate)}
            >
              {labelForFilter(candidate)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="diagnostics-close"
          aria-label="Close diagnostics"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div
        className="diagnostics-listbox"
        // A native select cannot contain the required rich diagnostic rows.
        // biome-ignore lint/a11y/useSemanticElements: This is a composite listbox with remediation disclosures.
        role="listbox"
        aria-label={`${labelForFilter(filter)} diagnostics`}
        aria-multiselectable="false"
        tabIndex={0}
        onKeyDown={handleListboxKeyDown}
      >
        {visibleDiagnostics.map((diagnostic, index) => {
          const key = diagnosticKey(diagnostic, index);
          const isSelected =
            selectedId !== null && diagnostic.elements.includes(selectedId);
          const isExpanded = expandedRows.has(key);

          return (
            <div
              key={key}
              className={`diagnostic-row ${diagnostic.severity}${isSelected ? " selected" : ""}`}
              // A native option cannot contain the required remediation disclosure.
              // biome-ignore lint/a11y/useSemanticElements: This rich option supports row actions and expanded content.
              role="option"
              aria-selected={isSelected}
              tabIndex={index === 0 ? 0 : -1}
              onClick={() => onSelectDiagnostic(diagnostic)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelectDiagnostic(diagnostic);
              }}
            >
              <span
                className={`diagnostic-severity-marker ${diagnostic.severity}`}
                aria-label={diagnostic.severity}
              />
              <span className="diagnostic-message">{diagnostic.message}</span>
              <span className="diagnostic-code">{diagnostic.code}</span>
              <span className="diagnostic-line">
                Line {diagnostic.span.start.line}
              </span>
              {diagnostic.remediation ? (
                <>
                  <button
                    type="button"
                    className="diagnostic-remediation-toggle"
                    aria-expanded={isExpanded}
                    onClick={(event) => toggleRemediation(event, key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.stopPropagation();
                      }
                    }}
                  >
                    {isExpanded ? "Hide remediation" : "Show remediation"}
                  </button>
                  {isExpanded ? (
                    <p className="diagnostic-remediation">
                      {diagnostic.remediation}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </dialog>
  );
}
