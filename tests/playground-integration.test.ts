import { awsProvider, createCloudMer } from "@cloudmer/core";
import { describe, expect, it } from "vitest";
import { ARCHITECTURE_EXAMPLES } from "../apps/playground/src/examples.js";

describe("Phase 5: Playground Architecture Examples & Render Integration", () => {
  const cloudmer = createCloudMer({
    providers: [awsProvider()],
  });

  it("renders all built-in architecture examples without structural errors", async () => {
    expect(ARCHITECTURE_EXAMPLES.length).toBeGreaterThanOrEqual(5);

    for (const example of ARCHITECTURE_EXAMPLES) {
      const res = await cloudmer.render(example.source);
      expect(res.svg).toContain("<svg");
      expect(res.graph.nodes.length).toBeGreaterThan(0);
      const structuralErrors = res.diagnostics.filter((d) =>
        d.code.startsWith("CM-STRUCT-"),
      );
      expect(structuralErrors).toHaveLength(0);
    }
  });

  it("contains unique example identifiers and valid sources", () => {
    const ids = ARCHITECTURE_EXAMPLES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ARCHITECTURE_EXAMPLES.length);

    for (const example of ARCHITECTURE_EXAMPLES) {
      expect(example.id).toBeDefined();
      expect(example.title).toBeDefined();
      expect(example.source).toContain("provider aws");
    }
  });
});
