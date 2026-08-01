import { describe, expect, it } from "vitest";
import {
  GENERIC_CLOUD_ICON_SVG,
  IconLoader,
  createIconLoader,
  createNodeIconLoader,
  sanitizeSvg,
} from "./index.js";
import type { SanitizedIcon } from "./index.js";

describe("@archlex/icons package initialization", () => {
  it("exports generic cloud icon fallback SVG with valid viewBox", () => {
    expect(GENERIC_CLOUD_ICON_SVG).toContain('<svg viewBox="0 0 64 64"');
  });

  it("exposes the shared core and Node adapter from the package root", () => {
    expect(createIconLoader).toBeTypeOf("function");
    expect(createNodeIconLoader).toBeTypeOf("function");
  });

  it("keeps deprecated synchronous Node imports available during migration", () => {
    expect(IconLoader.reset).toBeTypeOf("function");
    expect(() =>
      sanitizeSvg(
        "aws",
        "unsafe",
        '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      ),
    ).toThrow();
  });
});
