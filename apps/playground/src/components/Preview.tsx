import { mountSvg } from "@cloudmer/core/browser";
import { useEffect, useRef } from "react";

interface PreviewProps {
  svg: string;
  isRendering: boolean;
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
}

export function Preview({
  svg,
  isRendering,
  selectedId,
  onSelectElement,
}: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svg) return;

    try {
      const mounted = mountSvg(containerRef.current, svg);

      // Add click listeners to graphics elements for selection sync
      const elements = Array.from(
        mounted.querySelectorAll("[data-cloudmer-id]"),
      );
      for (const elem of elements) {
        const id = elem.getAttribute("data-cloudmer-id");

        if (id === selectedId) {
          elem.classList.add("selected");
        } else {
          elem.classList.remove("selected");
        }

        (elem as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          onSelectElement(id);
        };
      }

      mounted.onclick = () => onSelectElement(null);
    } catch {
      // Keep prior SVG if mounting failed
    }
  }, [svg, selectedId, onSelectElement]);

  const hasNodes =
    svg.includes("data-cloudmer-id") || svg.includes("cloudmer-scope");

  return (
    <section className="preview-pane" aria-label="Architecture Diagram Preview">
      <div className="pane-header">
        <h2>Architecture Diagram</h2>
        {isRendering && <span className="rendering-spinner">Updating...</span>}
      </div>

      <div className="preview-viewport">
        {!hasNodes && !isRendering ? (
          <div className="empty-state">
            <div className="empty-icon">📐</div>
            <p className="empty-title">No resources declared</p>
            <p className="empty-hint">
              Add resources or relationships below to render a diagram:
            </p>
            <code className="empty-code">rds-proxy &gt; rds &gt; ecs</code>
          </div>
        ) : (
          <div ref={containerRef} className="svg-container" />
        )}
      </div>
    </section>
  );
}
