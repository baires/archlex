import { describe, expect, it } from "vitest";
import { calculateFitScale, clampScale } from "./preview-transform.js";

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
});
