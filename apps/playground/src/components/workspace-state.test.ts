import type { Diagnostic } from "@archlex/model";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPLIT_RATIO,
  clampSplitRatio,
  shouldAutoOpenDiagnostics,
  summarizeDiagnostics,
} from "./workspace-state.js";

const diagnostic = (severity: Diagnostic["severity"]): Diagnostic => ({
  severity,
  code: `AL-${severity}`,
  message: severity,
  span: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 2, offset: 1 },
  },
  elements: [],
});

describe("workspace state", () => {
  it("defaults to a 40/60 split and clamps persisted values", () => {
    expect(DEFAULT_SPLIT_RATIO).toBe(0.4);
    expect(clampSplitRatio(Number.NaN)).toBe(0.4);
    expect(clampSplitRatio(0.1)).toBe(0.25);
    expect(clampSplitRatio(0.8)).toBe(0.7);
    expect(clampSplitRatio(0.55)).toBe(0.55);
  });

  it("summarizes each severity independently", () => {
    expect(
      summarizeDiagnostics([
        diagnostic("error"),
        diagnostic("warning"),
        diagnostic("info"),
        diagnostic("warning"),
      ]),
    ).toEqual({ error: 1, warning: 2, info: 1, total: 4 });
  });

  it("opens only when a completed result introduces errors", () => {
    const clear = { error: 0, warning: 0, info: 0, total: 0 };
    const warning = { error: 0, warning: 1, info: 0, total: 1 };
    const error = { error: 1, warning: 0, info: 0, total: 1 };
    expect(shouldAutoOpenDiagnostics(clear, warning)).toBe(false);
    expect(shouldAutoOpenDiagnostics(clear, error)).toBe(true);
    expect(shouldAutoOpenDiagnostics(error, error)).toBe(false);
  });
});
