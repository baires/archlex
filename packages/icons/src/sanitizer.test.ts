import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitizer.js";

describe("sanitizeSvg", () => {
  it("sanitizes a valid SVG and computes checksum", () => {
    const rawSvg =
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10H0z" fill="#ff0000"/></svg>';
    const result = sanitizeSvg("aws", "lambda", rawSvg);
    expect(result).toBeDefined();
    expect(result.provider).toBe("aws");
    expect(result.key).toBe("lambda");
    expect(result.viewBox).toBe("0 0 64 64");
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.svgFragment).toContain('fill="#ff0000"');
  });

  it("rejects SVG with active script tags", () => {
    const malicious =
      '<svg viewBox="0 0 64 64"><script>alert(1)</script></svg>';
    expect(() => sanitizeSvg("aws", "bad", malicious)).toThrow(
      /unsupported or active element/i,
    );
  });

  it("rejects SVG with DOCTYPE declaration", () => {
    const malicious =
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg viewBox="0 0 64 64"></svg>';
    expect(() => sanitizeSvg("aws", "bad", malicious)).toThrow(
      /forbidden DOCTYPE/i,
    );
  });

  it("rejects SVG with event handlers like onload", () => {
    const malicious = '<svg viewBox="0 0 64 64" onload="alert(1)"></svg>';
    expect(() => sanitizeSvg("aws", "bad", malicious)).toThrow(
      /forbidden event attribute/i,
    );
  });

  it("inlines GCP style blocks correctly", () => {
    const gcpSvg =
      '<svg viewBox="0 0 64 64"><style>.st0{fill:#4285F4;}</style><path class="st0" d="M0 0h10v10H0z"/></svg>';
    const result = sanitizeSvg("gcp", "bigquery", gcpSvg);
    expect(result.svgFragment).toContain('fill="#4285F4"');
  });
});
