import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CommandBar", () => {
  const source = readFileSync(
    new URL("./CommandBar.tsx", import.meta.url),
    "utf8",
  );

  it("groups examples by provider and displays their use cases", () => {
    expect(source).toContain("EXAMPLE_PROVIDERS.map");
    expect(source).toContain("example.provider === provider");
    expect(source).toContain("<optgroup");
    expect(source).toContain("EXAMPLE_PROVIDER_LABELS[provider]");
    expect(source).toContain("{example.useCase} · {example.title}");
  });
});
