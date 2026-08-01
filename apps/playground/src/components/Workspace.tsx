import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  clampSplitRatio,
} from "./workspace-state.js";

export type WorkspaceTab = "editor" | "preview";
export type FullscreenMode = "off" | "native" | "in-app";

interface WorkspaceFullscreenController {
  mode: FullscreenMode;
  isFullscreen: boolean;
  workspaceRef: RefObject<HTMLElement | null>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

export function useWorkspaceFullscreen(): WorkspaceFullscreenController {
  const workspaceRef = useRef<HTMLElement>(null);
  const entryTriggerRef = useRef<HTMLElement | null>(null);
  const modeRef = useRef<FullscreenMode>("off");
  const [mode, setModeState] = useState<FullscreenMode>("off");

  const setMode = useCallback((nextMode: FullscreenMode) => {
    modeRef.current = nextMode;
    setModeState(nextMode);
  }, []);

  const restoreEntryFocus = useCallback(() => {
    window.requestAnimationFrame(() => entryTriggerRef.current?.focus());
  }, []);

  const finishFullscreen = useCallback(() => {
    setMode("off");
    restoreEntryFocus();
  }, [restoreEntryFocus, setMode]);

  const enterFullscreen = useCallback(async () => {
    const workspace = workspaceRef.current;
    entryTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!workspace?.requestFullscreen) {
      setMode("in-app");
      return;
    }

    try {
      await workspace.requestFullscreen();
      setMode(document.fullscreenElement === workspace ? "native" : "in-app");
    } catch {
      setMode("in-app");
    }
  }, [setMode]);

  const exitFullscreen = useCallback(async () => {
    if (modeRef.current === "native" && document.fullscreenElement) {
      await document.exitFullscreen();
    }
    finishFullscreen();
  }, [finishFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (modeRef.current === "native" && document.fullscreenElement === null) {
        finishFullscreen();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modeRef.current === "off" || event.key !== "Escape") return;
      event.preventDefault();
      void exitFullscreen();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [exitFullscreen, finishFullscreen]);

  return {
    mode,
    isFullscreen: mode !== "off",
    workspaceRef,
    enterFullscreen,
    exitFullscreen,
  };
}

interface WorkspaceProps {
  workspaceRef: RefObject<HTMLElement | null>;
  splitRatio: number;
  onSplitRatioChange: (value: number) => void;
  editor: ReactNode;
  preview: ReactNode;
  diagnosticsDrawer: ReactNode;
  statusBar: ReactNode;
  isFullscreen: boolean;
  fullscreenMode: FullscreenMode;
}

const tabs: readonly WorkspaceTab[] = ["editor", "preview"];

function labelForTab(tab: WorkspaceTab): string {
  return tab === "editor" ? "Editor" : "Preview";
}

export function Workspace({
  workspaceRef,
  splitRatio,
  onSplitRatioChange,
  editor,
  preview,
  diagnosticsDrawer,
  statusBar,
  isFullscreen,
  fullscreenMode,
}: WorkspaceProps) {
  const resizePointerIdRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("editor");

  const updateSplitRatio = (value: number) => {
    onSplitRatioChange(clampSplitRatio(value));
  };

  const resizeFromPointer = (clientX: number) => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const bounds = workspace.getBoundingClientRect();
    if (bounds.width === 0) return;
    updateSplitRatio((clientX - bounds.left) / bounds.width);
  };

  const handleSeparatorPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    resizePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeFromPointer(event.clientX);
  };

  const handleSeparatorPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (resizePointerIdRef.current !== event.pointerId) return;
    resizeFromPointer(event.clientX);
  };

  const finishPointerResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizePointerIdRef.current !== event.pointerId) return;
    resizePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSeparatorKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        updateSplitRatio(splitRatio - 0.02);
        break;
      case "ArrowRight":
        event.preventDefault();
        updateSplitRatio(splitRatio + 0.02);
        break;
      case "Home":
        event.preventDefault();
        updateSplitRatio(MIN_SPLIT_RATIO);
        break;
      case "End":
        event.preventDefault();
        updateSplitRatio(MAX_SPLIT_RATIO);
        break;
    }
  };

  const selectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();

    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % tabs.length
        : (currentIndex - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    selectTab(nextTab);
    document.getElementById(`workspace-tab-${nextTab}`)?.focus();
  };

  return (
    <main
      ref={workspaceRef}
      className={`workspace workspace-grid${
        isFullscreen ? " is-fullscreen" : ""
      }`}
      data-testid="workspace"
      data-fullscreen-mode={fullscreenMode}
      style={{ gridTemplateColumns: `${splitRatio * 100}% 1px 1fr` }}
    >
      <div className="workspace-tablist" role="tablist" aria-label="Workspace">
        {tabs.map((tab) => (
          <button
            key={tab}
            id={`workspace-tab-${tab}`}
            type="button"
            role="tab"
            aria-controls={`workspace-panel-${tab}`}
            aria-selected={activeTab === tab}
            className="workspace-tab"
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => selectTab(tab)}
            onKeyDown={handleTabKeyDown}
          >
            {labelForTab(tab)}
          </button>
        ))}
      </div>

      <section
        id="workspace-panel-editor"
        className={`workspace-panel workspace-editor-panel${
          activeTab === "editor" ? " is-active" : ""
        }`}
        role="tabpanel"
        aria-labelledby="workspace-tab-editor"
      >
        {editor}
      </section>

      <div
        className="workspace-splitter"
        role="separator"
        aria-label="Resize editor and preview"
        aria-orientation="vertical"
        aria-valuemin={MIN_SPLIT_RATIO * 100}
        aria-valuemax={MAX_SPLIT_RATIO * 100}
        aria-valuenow={Math.round(splitRatio * 100)}
        tabIndex={0}
        onPointerDown={handleSeparatorPointerDown}
        onPointerMove={handleSeparatorPointerMove}
        onPointerUp={finishPointerResize}
        onPointerCancel={finishPointerResize}
        onKeyDown={handleSeparatorKeyDown}
      />

      <section
        id="workspace-panel-preview"
        className={`workspace-panel workspace-preview-panel${
          activeTab === "preview" ? " is-active" : ""
        }`}
        role="tabpanel"
        aria-labelledby="workspace-tab-preview"
      >
        {preview}
      </section>

      {diagnosticsDrawer}
      {statusBar}
    </main>
  );
}
