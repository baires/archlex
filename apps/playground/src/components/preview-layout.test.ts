import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(
  new URL("./Preview.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("preview canvas layout", () => {
  it("embeds preview chrome inside the diagram canvas", () => {
    expect(previewSource).not.toContain('<div className="pane-header">');
    expect(previewSource).toContain('className="preview-canvas-label"');
    expect(previewSource).toContain('className="preview-overlay"');
    expect(styles).toContain("radial-gradient(");
    expect(styles).toContain("var(--border-subtle)");
  });
});
