import { describe, expect, it } from "vitest";
import { ARCHLEX_LANGUAGE_METADATA } from "./language-metadata.js";

describe("ArchLex language metadata", () => {
  it("exports one structured registry for directives, scopes, operators, and relationships", () => {
    expect(
      ARCHLEX_LANGUAGE_METADATA.directives.map(({ name }) => name),
    ).toEqual(["provider", "direction", "validation", "theme"]);
    expect(ARCHLEX_LANGUAGE_METADATA.scopes.map(({ kind }) => kind)).toEqual([
      "account",
      "region",
      "vpc",
      "subnet",
      "cluster",
      "namespace",
    ]);
    expect(
      ARCHLEX_LANGUAGE_METADATA.operators.map(({ value }) => value),
    ).toContain("->");
    expect(
      ARCHLEX_LANGUAGE_METADATA.relationships.map(({ kind }) => kind),
    ).toContain("connects");
  });

  it("keeps every registry identifier unique", () => {
    for (const values of [
      ARCHLEX_LANGUAGE_METADATA.directives.map(({ name }) => name),
      ARCHLEX_LANGUAGE_METADATA.scopes.map(({ kind }) => kind),
      ARCHLEX_LANGUAGE_METADATA.operators.map(({ value }) => value),
      ARCHLEX_LANGUAGE_METADATA.relationships.map(({ kind }) => kind),
    ]) {
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("assigns a known area to every relationship kind", () => {
    const areas = new Set([
      "connectivity",
      "data",
      "events",
      "operations",
      "processing",
      "delivery",
      "governance",
      "lifecycle",
      "dependency",
      "reliability",
    ]);
    for (const relationship of ARCHLEX_LANGUAGE_METADATA.relationships) {
      expect(areas.has(relationship.area)).toBe(true);
    }
  });

  it("gives every relationship searchable metadata", () => {
    for (const relationship of ARCHLEX_LANGUAGE_METADATA.relationships) {
      expect(relationship.searchTerms.length).toBeGreaterThan(0);
      expect(relationship.searchTerms).not.toContain(relationship.kind);
    }
  });

  it("includes the extended relationship vocabulary", () => {
    const kinds = ARCHLEX_LANGUAGE_METADATA.relationships.map(
      ({ kind }) => kind,
    );
    for (const kind of [
      "authenticates",
      "authorizes",
      "audits",
      "scans",
      "streams",
      "stores",
      "backs-up",
      "restores",
      "notifies",
      "provisions",
      "archives",
      "depends-on",
      "attaches",
      "exposes",
      "fails-over-to",
      "trusts",
    ]) {
      expect(kinds).toContain(kind);
    }
  });
});
