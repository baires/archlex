import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

export interface ExportOptions {
  scale?: number;
  backgroundColor?: string;
}

/**
 * Export SVG string to PNG using Playwright
 */
export async function svgToPng(
  svgContent: string,
  outputPath: string,
  options: ExportOptions = {},
): Promise<void> {
  const { scale = 2, backgroundColor = "transparent" } = options;

  // Parse SVG to get dimensions
  const widthMatch = svgContent.match(/width="(\d+(?:\.\d+)?)"/);
  const heightMatch = svgContent.match(/height="(\d+(?:\.\d+)?)"/);

  if (!widthMatch || !heightMatch) {
    throw new Error("Could not determine SVG dimensions");
  }

  const width = Number.parseFloat(widthMatch[1]);
  const height = Number.parseFloat(heightMatch[1]);

  // Create HTML page with SVG
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${backgroundColor};
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
  `.trim();

  // Launch browser and render
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: {
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
      },
      deviceScaleFactor: scale,
    });

    await page.setContent(html);

    // Wait for fonts and rendering
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: "png",
      omitBackground: backgroundColor === "transparent",
    });
  } finally {
    await browser.close();
  }
}

/**
 * Write SVG content to file
 */
export async function writeSvg(
  svgContent: string,
  outputPath: string,
): Promise<void> {
  await writeFile(outputPath, svgContent, "utf-8");
}
