/**
 * Export utilities for ArchLex diagrams
 */

/**
 * Extract logical width and height from SVG string via width/height attributes or viewBox
 */
export function getSvgDimensions(svgString: string): {
  width: number;
  height: number;
} {
  // 1. Try width and height attributes
  const widthMatch = svgString.match(/<svg\b[^>]*\bwidth="([0-9.]+)(?:px)?"/i);
  const heightMatch = svgString.match(
    /<svg\b[^>]*\bheight="([0-9.]+)(?:px)?"/i,
  );

  let width = widthMatch ? Number.parseFloat(widthMatch[1]) : 0;
  let height = heightMatch ? Number.parseFloat(heightMatch[1]) : 0;

  // 2. Fall back to viewBox="minX minY width height"
  if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
    const viewBoxMatch = svgString.match(/<svg\b[^>]*\bviewBox="([^"]+)"/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
      if (parts.length === 4) {
        const vbWidth = Number.parseFloat(parts[2]);
        const vbHeight = Number.parseFloat(parts[3]);
        if (!Number.isNaN(vbWidth) && vbWidth > 0) width = vbWidth;
        if (!Number.isNaN(vbHeight) && vbHeight > 0) height = vbHeight;
      }
    }
  }

  return {
    width: width > 0 ? width : 800,
    height: height > 0 ? height : 600,
  };
}

/**
 * Normalizes SVG string by injecting explicit target width, height, and xmlns attributes
 */
export function prepareSvgForRasterization(
  svgString: string,
  exportWidth: number,
  exportHeight: number,
): string {
  let prepared = svgString;

  // Ensure xmlns is present on root <svg> tag
  if (!/<svg[^>]*\bxmlns=/i.test(prepared)) {
    prepared = prepared.replace(
      /<svg\b/i,
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }

  // Inject or replace width and height on root <svg> tag
  return prepared.replace(/<svg\b([^>]*)>/i, (_match, head) => {
    let newHead = head;
    if (/\bwidth="[^"]*"/i.test(newHead)) {
      newHead = newHead.replace(/\bwidth="[^"]*"/i, `width="${exportWidth}"`);
    } else {
      newHead += ` width="${exportWidth}"`;
    }
    if (/\bheight="[^"]*"/i.test(newHead)) {
      newHead = newHead.replace(
        /\bheight="[^"]*"/i,
        `height="${exportHeight}"`,
      );
    } else {
      newHead += ` height="${exportHeight}"`;
    }
    return `<svg${newHead}>`;
  });
}

/**
 * Convert SVG string to PNG using canvas API
 * @param svgString - SVG markup as string
 * @param scale - Scale factor for high-DPI displays (default: 2)
 * @returns Promise resolving to PNG data URL
 */
export async function svgToPng(svgString: string, scale = 2): Promise<string> {
  const { width: targetWidth, height: targetHeight } =
    getSvgDimensions(svgString);

  const exportWidth = Math.round(targetWidth * scale);
  const exportHeight = Math.round(targetHeight * scale);

  const maxSize = 8192;
  if (exportWidth > maxSize || exportHeight > maxSize) {
    throw new Error(
      `Diagram too large: ${exportWidth}×${exportHeight}px exceeds maximum ${maxSize}×${maxSize}px`,
    );
  }

  const preparedSvg = prepareSvgForRasterization(
    svgString,
    exportWidth,
    exportHeight,
  );

  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors
    }
  }

  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([preparedSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = exportWidth;
        canvas.height = exportHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        ctx.drawImage(img, 0, 0, exportWidth, exportHeight);

        const pngDataUrl = canvas.toDataURL("image/png");
        URL.revokeObjectURL(svgUrl);
        resolve(pngDataUrl);
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("Failed to load SVG"));
    };

    img.src = svgUrl;
  });
}

/**
 * Download a data URL as a file
 * @param dataUrl - Data URL to download
 * @param filename - Filename for download
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
