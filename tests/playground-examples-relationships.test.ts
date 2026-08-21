import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { gcpProvider } from "@archlex/gcp";
import { k8sProvider } from "@archlex/k8s";
import { describe, expect, it } from "vitest";
import { ARCHITECTURE_EXAMPLES } from "../apps/playground/src/examples.js";

describe("Playground examples satisfy declared relationship constraints", () => {
  const archlex = createArchLex({
    providers: [awsProvider(), gcpProvider(), k8sProvider()],
  });

  it("no curated example triggers a relationship endpoint warning", () => {
    for (const example of ARCHITECTURE_EXAMPLES) {
      const result = archlex.analyze(archlex.parse(example.source).ast);
      const violations = result.diagnostics.filter((d) =>
        d.code.includes("RELATIONSHIP-INVALID-ENDPOINT"),
      );
      expect(
        violations,
        `${example.id}: ${violations.map((d) => d.message).join("; ")}`,
      ).toHaveLength(0);
    }
  });

  it("uses only recognized relationship kinds in curated examples", () => {
    for (const example of ARCHITECTURE_EXAMPLES) {
      const result = archlex.analyze(archlex.parse(example.source).ast);
      const unknown = result.diagnostics.filter(
        ({ code }) => code === "AL-SEM-UNKNOWN-RELATIONSHIP",
      );
      expect(
        unknown,
        `${example.id}: ${unknown.map(({ message }) => message).join("; ")}`,
      ).toHaveLength(0);
    }
  });
});
