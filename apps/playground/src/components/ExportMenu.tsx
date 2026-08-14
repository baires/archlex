import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon.js";

interface ExportMenuProps {
  disabled: boolean;
  onCopySvg: () => Promise<void>;
  onDownloadSvg: () => void;
  onDownloadPng: () => Promise<void>;
}

export function ExportMenu({
  disabled,
  onCopySvg,
  onDownloadSvg,
  onDownloadPng,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeMenu = () => setIsOpen(false);
  const closeMenuAndRestoreFocus = () => {
    closeMenu();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    menuItemRefs.current[0]?.focus();

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

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const menuItems = menuItemRefs.current.filter(
      (item): item is HTMLButtonElement => item !== null,
    );
    const currentIndex = menuItems.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenuAndRestoreFocus();
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex < 0
          ? menuItems.length - 1
          : (currentIndex - 1 + menuItems.length) % menuItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    menuItems[nextIndex]?.focus();
  };

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        title="Export"
        aria-label="Export menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="btn-label">Export</span> <Icon name="chevron-down" />
      </button>

      {isOpen ? (
        <div
          className="export-menu-popover"
          role="menu"
          aria-label="Export"
          onKeyDown={handleMenuKeyDown}
        >
          <button
            ref={(element) => {
              menuItemRefs.current[0] = element;
            }}
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
            ref={(element) => {
              menuItemRefs.current[1] = element;
            }}
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              onDownloadSvg();
            }}
          >
            <Icon name="download" /> Download SVG
          </button>
          <button
            ref={(element) => {
              menuItemRefs.current[2] = element;
            }}
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              void onDownloadPng();
            }}
          >
            <Icon name="download" /> Download PNG
          </button>
        </div>
      ) : null}
    </div>
  );
}
