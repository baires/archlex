import { describe, expect, it } from "vitest";
import { type ThemeTokens, darkTheme, lightTheme } from "./index.js";

const legacyTheme = {
  background: "#ffffff",
  scopeFill: "#f1f5f9",
  scopeStroke: "#cbd5e1",
  scopeTextFill: "#334155",
  nodeFill: "#f8fafc",
  nodeStroke: "#0284c7",
  textFill: "#0f172a",
  edgeStroke: "#64748b",
  arrowFill: "#64748b",
  errorStroke: "#ef4444",
  warningMarker: "#f59e0b",
  infoMarker: "#3b82f6",
} satisfies ThemeTokens;

describe("ThemeTokens source compatibility", () => {
  it("accepts the public token shape from before muted and hover tokens", () => {
    expect(legacyTheme.scopeTextFill).toBe("#334155");
    expect(legacyTheme.edgeStroke).toBe("#64748b");
  });
});

function relativeLuminance(hexColor: string): number {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received ${hexColor}`);
  }

  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

describe("neutral boundary contrast", () => {
  it.each([
    ["light node", lightTheme.nodeStroke, lightTheme.nodeFill],
    ["light scope", lightTheme.scopeStroke, lightTheme.scopeFill],
    ["dark node", darkTheme.nodeStroke, darkTheme.nodeFill],
    ["dark scope", darkTheme.scopeStroke, darkTheme.scopeFill],
  ])("keeps the %s boundary at 3:1 or higher", (_name, stroke, fill) => {
    expect(contrastRatio(stroke, fill)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ])("gives each %s scope kind a distinct accent", (_name, theme) => {
    const accents = theme.scopeAccents;
    expect(accents).toBeDefined();
    expect(new Set(Object.values(accents ?? {}))).toHaveLength(4);
  });
});
