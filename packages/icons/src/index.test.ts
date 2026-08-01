import { describe, expect, it } from "vitest";
import { GENERIC_CLOUD_ICON_SVG } from "./fallback.js";
import type { SanitizedIcon } from "./types.js";

describe("@archlex/icons package initialization", () => {
  it("exports generic cloud icon fallback SVG with valid viewBox", () => {
    expect(GENERIC_CLOUD_ICON_SVG).toContain('<svg viewBox="0 0 64 64"');
  });
});
