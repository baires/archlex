import { afterEach, describe, expect, it, vi } from "vitest";
import { svgToPng } from "./export.js";

describe("svgToPng", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("draws the SVG onto an untouched transparent canvas", async () => {
    const fillRect = vi.fn();
    const drawImage = vi.fn();
    const scale = vi.fn();
    const createObjectURL = vi.fn(() => "blob:diagram");
    const revokeObjectURL = vi.fn();
    const context = { drawImage, fillRect, scale };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toDataURL: vi.fn(() => "data:image/png;base64,transparent"),
    };

    class FakeImage {
      width = 100;
      height = 50;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => {
        expect(tagName).toBe("canvas");
        return canvas;
      }),
    });

    const result = await svgToPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>',
      2,
    );

    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(scale).toHaveBeenCalledWith(2, 2);
    expect(fillRect).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(result).toBe("data:image/png;base64,transparent");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:diagram");
  });
});
