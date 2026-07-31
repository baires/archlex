import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";

interface ExportMenuProps {
  disabled: boolean;
  onCopySvg: () => Promise<void>;
  onDownloadSvg: () => void;
}

export function ExportMenu({
  disabled,
  onCopySvg,
  onDownloadSvg,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        Export <Icon name="chevron-down" />
      </button>

      {isOpen ? (
        <div className="export-menu-popover" role="menu" aria-label="Export">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              void onCopySvg();
            }}
          >
            <Icon name="clipboard" /> Copy SVG
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              onDownloadSvg();
            }}
          >
            <Icon name="download" /> Download SVG
          </button>
        </div>
      ) : null}
    </div>
  );
}
