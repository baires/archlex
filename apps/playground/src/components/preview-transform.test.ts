import { describe, expect, it } from "vitest";
import {
  calculateAnchoredZoom,
  calculateCenteredZoom,
  calculateFitScale,
  calculateWheelZoomFactor,
  clampScale,
} from "./preview-transform.js";

describe("preview transform helpers", () => {
  it("clamps zoom to a readable supported range", () => {
    expect(clampScale(0.1)).toBe(0.25);
    expect(clampScale(1.4)).toBe(1.4);
    expect(clampScale(4)).toBe(3);
  });

  it("fits both diagram dimensions inside the padded viewport", () => {
    expect(
      calculateFitScale(
        { width: 1200, height: 600 },
        { width: 900, height: 500 },
        40,
      ),
    ).toBeCloseTo(0.6833);
  });

  it("returns actual size for missing geometry", () => {
    expect(
      calculateFitScale({ width: 0, height: 600 }, { width: 900, height: 500 }),
    ).toBe(1);
  });

  it("keeps the diagram point beneath the pointer fixed while zooming", () => {
    expect(
      calculateAnchoredZoom(1, { x: 0, y: 0 }, { x: 120, y: -60 }, 1.5),
    ).toEqual({ scale: 1.5, pan: { x: -60, y: 30 } });
  });

  it("uses the clamped scale to calculate anchored pan", () => {
    const result = calculateAnchoredZoom(
      2.9,
      { x: 10, y: 20 },
      { x: 100, y: 100 },
      4,
    );

    expect(result.scale).toBe(3);
    expect(result.pan.x).toBeCloseTo(6.8966);
    expect(result.pan.y).toBeCloseTo(17.2414);
  });

  it("scales wheel input proportionally and caps individual events", () => {
    expect(calculateWheelZoomFactor(-1, true)).toBeGreaterThan(1);
    expect(calculateWheelZoomFactor(-1, true)).toBeLessThan(
      calculateWheelZoomFactor(-12, true),
    );
    expect(calculateWheelZoomFactor(-1000, true)).toBe(1.08);
    expect(calculateWheelZoomFactor(1000, true)).toBe(0.92);
  });

  it("uses a stronger but still capped curve for ordinary wheel input", () => {
    expect(calculateWheelZoomFactor(-1, false)).toBeGreaterThan(
      calculateWheelZoomFactor(-1, true),
    );
    expect(calculateWheelZoomFactor(-1000, false)).toBe(1.16);
    expect(calculateWheelZoomFactor(1000, false)).toBe(0.84);
  });

  it("zooms around viewport center while preserving existing pan", () => {
    expect(calculateCenteredZoom(1, { x: 80, y: -40 }, 1.5)).toEqual({
      scale: 1.5,
      pan: { x: 120, y: -60 },
    });
  });
});
