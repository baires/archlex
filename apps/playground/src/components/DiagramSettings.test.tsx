import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DiagramSettings", () => {
  const source = readFileSync(
    new URL("./DiagramSettings.tsx", import.meta.url),
    "utf8",
  );

  it("exposes popover state and labelled native controls", () => {
    expect(source).toContain("aria-expanded={isOpen}");
    expect(source).toContain('aria-controls="diagram-settings-popover"');
    expect(source).toContain('htmlFor="direction-select"');
    expect(source).toContain('htmlFor="validation-select"');
    expect(source).toContain('event.key === "Escape"');
  });
});
