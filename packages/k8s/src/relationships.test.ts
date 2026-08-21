import { describe, expect, it } from "vitest";
import { K8S_RELATIONSHIPS } from "./relationships.js";

describe("Kubernetes relationship definitions", () => {
  it("declares provider-specific storage and scaling semantics", () => {
    const relationships = new Map(
      K8S_RELATIONSHIPS.map((relationship) => [
        relationship.kind,
        relationship,
      ]),
    );

    expect(relationships.get("mounts")).toEqual(
      expect.objectContaining({ providerSpecific: true }),
    );
    expect(relationships.get("binds")).toEqual(
      expect.objectContaining({ providerSpecific: true }),
    );
    expect(relationships.get("scales")).toEqual(
      expect.objectContaining({ providerSpecific: true }),
    );
    expect(relationships.get("schedules-on")).toEqual(
      expect.objectContaining({
        providerSpecific: true,
        allowedSources: ["pod"],
        allowedTargets: ["node"],
      }),
    );
  });
});
