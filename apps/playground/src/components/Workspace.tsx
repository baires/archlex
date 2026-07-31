import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useRef, useState } from "react";
import {
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  clampSplitRatio,
} from "./workspace-state.js";

export type WorkspaceTab = "editor" | "preview";

interface WorkspaceProps {
  splitRatio: number;
  onSplitRatioChange: (value: number) => void;
  editor: ReactNode;
  preview: ReactNode;
  diagnosticsDrawer: ReactNode;
  statusBar: ReactNode;
  isFullscreen: boolean;
}

const tabs: readonly WorkspaceTab[] = ["editor", "preview"];

function labelForTab(tab: WorkspaceTab): string {
  return tab === "editor" ? "Editor" : "Preview";
}

export function Workspace({
  splitRatio,
  onSplitRatioChange,
  editor,
  preview,
  diagnosticsDrawer,
  statusBar,
  isFullscreen,
}: WorkspaceProps) {
  const workspaceRef = useRef<HTMLElement>(null);
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
      className={`workspace-grid${isFullscreen ? " is-fullscreen" : ""}`}
      data-testid="workspace"
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
