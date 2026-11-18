import type { PresentationText } from "@archlex/model";
import type { ThemeTokens } from "../theme/index.js";

const PADDING = 28;
const FONT_FAMILY = "system-ui, sans-serif";
const segmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined;

interface PresentationFrame {
  width: number;
  height: number;
  accessibleName?: string;
  beforeGraph: string;
  afterGraph: string;
}

// Estimate conservatively without browser font metrics so Node, Workers, and
// browsers produce the same line breaks. Split long words at grapheme boundaries.
function wrapText(value: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  let line = "";
  let lineWidth = 0;

  for (const word of value.split(/\s+/)) {
    const segments = segmenter
      ? Array.from(segmenter.segment(word), ({ segment }) => segment)
      : Array.from(word);
    const glyphs = segments.map((segment) => ({
      segment,
      width:
        fontSize *
        (/^[\x20-\x7e]$/.test(segment) && !/[MW@%]/.test(segment)
          ? 0.72
          : 1.15),
    }));
    const wordWidth = glyphs.reduce((width, glyph) => width + glyph.width, 0);
    const spaceWidth = fontSize * 0.35;

    if (line && lineWidth + spaceWidth + wordWidth > maxWidth) {
      lines.push(line);
      line = "";
      lineWidth = 0;
    }

    if (line) {
      line += " ";
      lineWidth += spaceWidth;
    }

    for (const glyph of glyphs) {
      if (line && lineWidth + glyph.width > maxWidth) {
        lines.push(line);
        line = "";
        lineWidth = 0;
      }
      line += glyph.segment;
      lineWidth += glyph.width;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export function composePresentation(
  presentation: PresentationText,
  theme: ThemeTokens,
  graphWidth: number,
  graphHeight: number,
  escapeXml: (value: string) => string,
): PresentationFrame | undefined {
  const title = presentation.title?.trim();
  const sub = presentation.sub?.trim();
  const footer = presentation.footer?.trim();
  if (!title && !sub && !footer) return undefined;

  const width = Math.max(graphWidth + PADDING * 2, 360);
  const textWidth = Math.min(width - PADDING * 2, 760);
  const muted = theme.textMuted ?? theme.textFill;
  let y = PADDING;

  function renderText(
    value: string,
    className: string,
    fill: string,
    fontSize: number,
    weight: number,
  ): string {
    const lines = wrapText(value, textWidth, fontSize);
    const text = lines
      .map((line, index) => {
        const baseline = y + fontSize + index * fontSize * 1.3;
        return `<tspan x="${PADDING}" y="${baseline.toFixed(1)}">${escapeXml(line)}</tspan>`;
      })
      .join("");
    y += lines.length * fontSize * 1.3;
    return `  <text class="${className}" fill="${fill}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="${weight}">${text}</text>\n`;
  }

  const titleText = title
    ? renderText(title, "archlex-presentation-title", theme.textFill, 30, 700)
    : "";
  if (title && sub) y += 4;
  const subtitleText = sub
    ? renderText(sub, "archlex-presentation-subtitle", muted, 16, 400)
    : "";
  if (title || sub) y += 16;

  const graphX = (width - graphWidth) / 2;
  const graphY = y;
  y += graphHeight + 18;
  const rule = `  <line class="archlex-presentation-rule" x1="${PADDING}" y1="${y.toFixed(1)}" x2="${width - PADDING}" y2="${y.toFixed(1)}" stroke="${theme.scopeStroke}" aria-hidden="true"/>\n`;
  if (footer) y += 10;
  const footerText = footer
    ? renderText(footer, "archlex-presentation-footer", muted, 13, 400)
    : "";
  const height = y + PADDING;
  const svgTitle = title
    ? `  <title id="archlex-presentation-heading">${escapeXml(title)}</title>\n`
    : "";

  return {
    width,
    height,
    accessibleName: title
      ? 'aria-labelledby="archlex-presentation-heading"'
      : undefined,
    beforeGraph: `${svgTitle}  <rect width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="${theme.background}"/>\n${titleText}${subtitleText}  <g transform="translate(${graphX.toFixed(1)} ${graphY.toFixed(1)})">\n`,
    afterGraph: `  </g>\n${rule}${footerText}`,
  };
}
