import { mountSvg } from "@cloudmer/core/browser";
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon.js";
import { calculateFitScale, clampScale } from "./preview-transform.js";

interface PreviewProps {
  svg: string;
  isRendering: boolean;
  selectedId: string | null;
  isFullscreen: boolean;
  onSelectElement: (id: string | null) => void;
  onExitFullscreen: () => void;
}

export function Preview({
  svg,
  isRendering,
  selectedId,
  isFullscreen,
  onSelectElement,
  onExitFullscreen,
}: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fullscreenExitRef = useRef<HTMLButtonElement>(null);
  const mountedSvgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const didPanRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const frameId = window.requestAnimationFrame(() => {
      fullscreenExitRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isFullscreen]);

  const hasNodes =
    Boolean(svg) &&
    (svg.includes("data-cloudmer-id") || svg.includes("cloudmer-scope"));

  const fitDiagram = useCallback(() => {
    const mounted = mountedSvgRef.current;
    const viewport = viewportRef.current;
    if (!mounted || !viewport) return;

    const viewBox = mounted.viewBox.baseVal;
    const viewportBox = viewport.getBoundingClientRect();
    setScale(
      calculateFitScale(
        { width: viewBox.width, height: viewBox.height },
        { width: viewportBox.width, height: viewportBox.height },
        32,
      ),
    );
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((amount: number) => {
    setScale((current) => clampScale(current + amount));
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    didPanRef.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!didPanRef.current && Math.abs(deltaX) <= 2 && Math.abs(deltaY) <= 2) {
      return;
    }
    if (!didPanRef.current) {
      didPanRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPanning(true);
    }
    setPan({ x: drag.originX + deltaX, y: drag.originY + deltaY });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setScale((current) =>
      clampScale(current + (event.deltaY < 0 ? 0.1 : -0.1)),
    );
  };

  useEffect(() => {
    if (!containerRef.current || !svg) return;

    try {
      const mounted = mountSvg(containerRef.current, svg);
      mountedSvgRef.current = mounted;
      const viewBox = mounted.viewBox.baseVal;
      mounted.setAttribute("width", String(viewBox.width));
      mounted.setAttribute("height", String(viewBox.height));

      const elements = Array.from(
        mounted.querySelectorAll("[data-cloudmer-id]"),
      );
      for (const elem of elements) {
        const id = elem.getAttribute("data-cloudmer-id");

        elem.classList.toggle("selected", id === selectedId);

        (elem as HTMLElement).onclick = (event) => {
          event.stopPropagation();
          if (didPanRef.current) {
            didPanRef.current = false;
            return;
          }
          onSelectElement(id);
        };
        (elem as HTMLElement).onkeydown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          onSelectElement(id);
        };
      }

      mounted.onclick = () => {
        if (didPanRef.current) {
          didPanRef.current = false;
          return;
        }
        onSelectElement(null);
      };
      requestAnimationFrame(fitDiagram);
    } catch (error: unknown) {
      console.error("mountSvg error:", error);
    }
  }, [svg, selectedId, onSelectElement, fitDiagram]);

  return (
    <section
      className="preview-pane"
      aria-label="Architecture Diagram Preview"
      data-testid="preview"
    >
      <div className="pane-header">
        <h2>Preview</h2>
        <div className="preview-header-actions">
          {hasNodes && !isFullscreen ? (
            <div
              className="preview-controls"
              aria-label="Diagram view controls"
            >
              <button
                type="button"
                onClick={() => zoomBy(-0.1)}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Icon name="zoom-out" />
              </button>
              <output aria-label="Zoom level">
                {Math.round(scale * 100)}%
              </output>
              <button
                type="button"
                onClick={() => zoomBy(0.1)}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Icon name="zoom-in" />
              </button>
              <button
                type="button"
                onClick={fitDiagram}
                aria-label="Fit diagram"
                title="Fit diagram to viewport"
              >
                <Icon name="fit" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                }}
                aria-label="Actual size"
                title="Reset to 100%"
              >
                100%
              </button>
            </div>
          ) : null}
          {isRendering ? (
            <span className="rendering-spinner" aria-live="polite">
              Rendering…
            </span>
          ) : null}
        </div>
      </div>

      {isFullscreen ? (
        <div
          className="preview-controls fullscreen-view-controls"
          aria-label="Fullscreen diagram view controls"
        >
          <button
            type="button"
            onClick={() => zoomBy(-0.1)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Icon name="zoom-out" />
          </button>
          <output aria-label="Zoom level">{Math.round(scale * 100)}%</output>
          <button
            type="button"
            onClick={() => zoomBy(0.1)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Icon name="zoom-in" />
          </button>
          <button
            type="button"
            onClick={fitDiagram}
            aria-label="Fit diagram"
            title="Fit diagram to viewport"
          >
            <Icon name="fit" />
          </button>
          <button
            ref={fullscreenExitRef}
            type="button"
            onClick={onExitFullscreen}
            aria-label="Exit fullscreen preview"
            title="Exit fullscreen preview"
          >
            <Icon name="exit-fullscreen" />
          </button>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={`preview-viewport${isPanning ? " is-panning" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {!hasNodes && !isRendering ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="fit" size={32} />
            </div>
            <p className="empty-title">No diagram yet</p>
            <p className="empty-hint">Write CloudMer DSL to preview it here.</p>
          </div>
        ) : null}
        <div
          className="preview-stage"
          data-pan-x={Math.round(pan.x)}
          data-pan-y={Math.round(pan.y)}
          style={{
            display: hasNodes ? "block" : "none",
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <div ref={containerRef} className="svg-container" />
        </div>
      </div>
    </section>
  );
}
