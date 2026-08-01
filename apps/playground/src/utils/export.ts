/**
 * Export utilities for CloudMer diagrams
 */

/**
 * Convert SVG string to PNG using canvas API
 * @param svgString - SVG markup as string
 * @param scale - Scale factor for high-DPI displays (default: 2)
 * @returns Promise resolving to PNG data URL
 */
export async function svgToPng(svgString: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create SVG data URL
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create image element
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate dimensions
        const width = img.width * scale;
        const height = img.height * scale;

        // Check canvas size limits (most browsers: 8192x8192)
        const maxSize = 8192;
        if (width > maxSize || height > maxSize) {
          throw new Error(
            `Diagram too large: ${width}×${height}px exceeds maximum ${maxSize}×${maxSize}px`,
          );
        }

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        // Scale for high-DPI
        ctx.scale(scale, scale);

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Convert to PNG
        const pngDataUrl = canvas.toDataURL("image/png");

        // Cleanup
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
