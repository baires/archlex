import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSvgDimensions,
  prepareSvgForRasterization,
  svgToPng,
} from "./export.js";

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
    expect(fillRect).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 200, 100);
    expect(result).toBe("data:image/png;base64,transparent");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:diagram");
  });

  it("extracts dimensions from viewBox when width and height attributes are absent", async () => {
    const drawImage = vi.fn();
    const createObjectURL = vi.fn(() => "blob:diagram-viewbox");
    const revokeObjectURL = vi.fn();
    const scale = vi.fn();
    const context = { drawImage, scale };

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toDataURL: vi.fn(() => "data:image/png;base64,viewbox-test"),
    };

    class FakeImage {
      width = 300; // Simulated DOM default when SVG lacks width/height attributes
      height = 150;
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
        if (tagName === "canvas") return canvas;
        return {};
      }),
    });

    const svgWithoutDimensions =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1420 850" role="graphics-document"></svg>';

    const result = await svgToPng(svgWithoutDimensions, 2);

    expect(canvas.width).toBe(2840);
    expect(canvas.height).toBe(1700);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2840, 1700);
    expect(result).toBe("data:image/png;base64,viewbox-test");
  });

  describe("getSvgDimensions", () => {
    it("parses explicit width and height attributes", () => {
      const svg =
        '<svg width="1200px" height="800px" viewBox="0 0 100 50"></svg>';
      expect(getSvgDimensions(svg)).toEqual({ width: 1200, height: 800 });
    });

    it("parses viewBox when width/height are absent", () => {
      const svg = '<svg viewBox="0 0 1420.5 850.25"></svg>';
      expect(getSvgDimensions(svg)).toEqual({ width: 1420.5, height: 850.25 });
    });

    it("falls back to default dimensions when no sizing info exists", () => {
      const svg = "<svg></svg>";
      expect(getSvgDimensions(svg)).toEqual({ width: 800, height: 600 });
    });
  });

  describe("prepareSvgForRasterization", () => {
    it("injects width, height, and xmlns into svg tag", () => {
      const svg = '<svg viewBox="0 0 100 50"></svg>';
      const prepared = prepareSvgForRasterization(svg, 200, 100);
      expect(prepared).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(prepared).toContain('width="200"');
      expect(prepared).toContain('height="100"');
    });

    it("replaces existing width and height attributes", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>';
      const prepared = prepareSvgForRasterization(svg, 400, 200);
      expect(prepared).toContain('width="400"');
      expect(prepared).toContain('height="200"');
      expect(prepared).not.toContain('width="100"');
    });
  });
});
