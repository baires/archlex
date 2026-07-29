import { describe, expect, it } from "vitest";
import { visualSnapshotsSupported } from "./browser/visual-platform.mjs";

describe("visual snapshot platform policy", () => {
  it("runs the tracked baselines only on Darwin", () => {
    expect(visualSnapshotsSupported("darwin")).toBe(true);
    expect(visualSnapshotsSupported("linux")).toBe(false);
    expect(visualSnapshotsSupported("win32")).toBe(false);
  });
});
