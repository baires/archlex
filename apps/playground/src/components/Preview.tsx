import { mountSvg } from "@archlex/core/browser";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon.js";
import {
  type PinchState,
  calculateCenteredZoom,
  calculateFitScale,
  calculatePinchTransform,
  calculateWheelZoomFactor,
} from "./preview-transform.js";

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
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const singleDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchStateRef = useRef<PinchState | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const didPanRef = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
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
    (svg.includes("data-archlex-id") || svg.includes("archlex-scope"));

  const updatePan = useCallback((nextPan: { x: number; y: number }) => {
    panRef.current = nextPan;
    setPan(nextPan);
  }, []);

  const updateScale = useCallback((nextScale: number) => {
    scaleRef.current = nextScale;
    setScale(nextScale);
  }, []);

  const fitDiagram = useCallback(() => {
    const mounted = mountedSvgRef.current;
    const viewport = viewportRef.current;
    if (!mounted || !viewport) return;

    const viewBox = mounted.viewBox.baseVal;
    const viewportBox = viewport.getBoundingClientRect();
    const newScale = calculateFitScale(
      { width: viewBox.width, height: viewBox.height },
      { width: viewportBox.width, height: viewportBox.height },
      64,
    );
    updateScale(newScale);
    updatePan({ x: 0, y: 0 });
  }, [updatePan, updateScale]);

  const zoomTo = useCallback(
    (getNextScale: (currentScale: number) => number) => {
      const currentScale = scaleRef.current;
      const next = calculateCenteredZoom(
        currentScale,
        panRef.current,
        getNextScale(currentScale),
      );
      updateScale(next.scale);
      updatePan(next.pan);
    },
    [updatePan, updateScale],
  );

  const zoomBy = useCallback(
    (factor: number) => zoomTo((currentScale) => currentScale * factor),
    [zoomTo],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(calculateWheelZoomFactor(event.deltaY, event.ctrlKey));
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [zoomBy]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest(".preview-overlay")) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors on unsupported environments
      }
    }

    const count = activePointersRef.current.size;
    if (count === 1) {
      singleDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: panRef.current.x,
        originY: panRef.current.y,
      };
      pinchStateRef.current = null;
      didPanRef.current = false;
    } else if (count === 2 && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const points = Array.from(activePointersRef.current.values());
      const p1 = points[0];
      const p2 = points[1];
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const center = {
        x: (p1.x + p2.x) / 2 - (rect.left + rect.width / 2),
        y: (p1.y + p2.y) / 2 - (rect.top + rect.height / 2),
      };
      pinchStateRef.current = {
        scale: scaleRef.current,
        pan: panRef.current,
        distance,
        center,
      };
      singleDragRef.current = null;
      didPanRef.current = true;
      setIsPanning(true);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const count = activePointersRef.current.size;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (count === 1) {
        const drag = singleDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        if (
          !didPanRef.current &&
          Math.abs(deltaX) <= 2 &&
          Math.abs(deltaY) <= 2
        ) {
          return;
        }
        if (!didPanRef.current) {
          didPanRef.current = true;
          setIsPanning(true);
        }
        updatePan({ x: drag.originX + deltaX, y: drag.originY + deltaY });
      } else if (count === 2 && pinchStateRef.current && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const points = Array.from(activePointersRef.current.values());
        const p1 = points[0];
        const p2 = points[1];
        const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const currentCenter = {
          x: (p1.x + p2.x) / 2 - (rect.left + rect.width / 2),
          y: (p1.y + p2.y) / 2 - (rect.top + rect.height / 2),
        };

        const transform = calculatePinchTransform(pinchStateRef.current, {
          distance: currentDistance,
          center: currentCenter,
        });

        updateScale(transform.scale);
        updatePan(transform.pan);
      }
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    }
    activePointersRef.current.delete(event.pointerId);

    const remaining = Array.from(activePointersRef.current.entries());
    if (remaining.length === 1) {
      const [remainingId, pt] = remaining[0];
      singleDragRef.current = {
        pointerId: remainingId,
        startX: pt.x,
        startY: pt.y,
        originX: panRef.current.x,
        originY: panRef.current.y,
      };
      pinchStateRef.current = null;
    } else if (remaining.length === 0) {
      singleDragRef.current = null;
      pinchStateRef.current = null;
      setIsPanning(false);
    }
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
        mounted.querySelectorAll("[data-archlex-id]"),
      );
      for (const elem of elements) {
        const id = elem.getAttribute("data-archlex-id");

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
      <div
        ref={viewportRef}
        className={`preview-viewport${isPanning ? " is-panning" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="preview-canvas-label">Preview</span>
        <div className="preview-overlay">
          {isRendering ? (
            <span className="rendering-spinner" aria-live="polite">
              Rendering…
            </span>
          ) : null}
          {hasNodes ? (
            <div
              className="preview-controls"
              aria-label={
                isFullscreen
                  ? "Fullscreen diagram view controls"
                  : "Diagram view controls"
              }
            >
              <button
                type="button"
                onClick={() => zoomBy(1 / 1.1)}
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
                onClick={() => zoomBy(1.1)}
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
              {isFullscreen ? (
                <button
                  ref={fullscreenExitRef}
                  type="button"
                  onClick={onExitFullscreen}
                  aria-label="Exit fullscreen preview"
                  title="Exit fullscreen preview"
                >
                  <Icon name="exit-fullscreen" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    updateScale(1);
                    updatePan({ x: 0, y: 0 });
                  }}
                  aria-label="Actual size"
                  title="Reset to 100%"
                >
                  100%
                </button>
              )}
            </div>
          ) : null}
        </div>
        {!hasNodes && !isRendering ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="fit" size={32} />
            </div>
            <p className="empty-title">No diagram yet</p>
            <p className="empty-hint">Write ArchLex DSL to preview it here.</p>
          </div>
        ) : null}
        <div
          className="preview-stage"
          data-pan-x={Math.round(pan.x)}
          data-pan-y={Math.round(pan.y)}
          data-scale={scale.toFixed(4)}
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
