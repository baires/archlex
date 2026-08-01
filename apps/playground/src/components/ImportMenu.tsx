import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon.js";

interface ImportMenuProps {
  onImportFile: (content: string, filename: string) => void;
  onOpenUrlImport: () => void;
}

export function ImportMenu({ onImportFile, onOpenUrlImport }: ImportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        onImportFile(content, file.name);
        closeMenu();
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = "";
  };

  const handleFileImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleUrlImportClick = () => {
    closeMenu();
    onOpenUrlImport();
  };

  return (
    <div className="import-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        Import <Icon name="chevron-down" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".cloudmer,.txt,text/plain"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {isOpen ? (
        <div
          className="import-menu-popover"
          role="menu"
          aria-label="Import"
          onKeyDown={handleMenuKeyDown}
        >
          <button
            ref={(element) => {
              menuItemRefs.current[0] = element;
            }}
            type="button"
            role="menuitem"
            onClick={handleFileImportClick}
          >
            <Icon name="file" /> Import File
          </button>
          <button
            ref={(element) => {
              menuItemRefs.current[1] = element;
            }}
            type="button"
            role="menuitem"
            onClick={handleUrlImportClick}
          >
            <Icon name="link" /> Import from URL
          </button>
        </div>
      ) : null}
    </div>
  );
}
