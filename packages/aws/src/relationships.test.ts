import { describe, expect, it } from "vitest";
import { AWS_RELATIONSHIPS } from "./relationships.js";

describe("AWS relationship definitions", () => {
  it("declares relationship semantics used by curated AWS diagrams", () => {
    const kinds = AWS_RELATIONSHIPS.map(({ kind }) => kind);

    expect(kinds).toEqual(
      expect.arrayContaining([
        "routes",
        "replicates",
        "builds",
        "deploys",
        "archives",
        "attaches",
        "exposes",
        "fails-over-to",
        "trusts",
      ]),
    );

    expect(
      AWS_RELATIONSHIPS.find(({ kind }) => kind === "attaches")?.allowedTargets,
    ).toEqual(expect.arrayContaining(["ebs", "efs"]));
    expect(
      AWS_RELATIONSHIPS.find(({ kind }) => kind === "fails-over-to")
        ?.allowedSources,
    ).toEqual(expect.arrayContaining(["rds", "aurora"]));
  });
});
