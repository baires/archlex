import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARCHLEX_LANGUAGE_METADATA } from "../packages/core/src/language-metadata.js";
import {
  renderRelationshipBulletList,
  renderRelationshipMarkdownTable,
  replaceGeneratedRelationshipSection,
} from "./generate-relationship-docs.js";

const relationships = [
  {
    area: "connectivity" as const,
    kind: "routes",
    displayName: "Routes",
    documentation: "Routes traffic.",
  },
  {
    area: "data" as const,
    kind: "archives",
    displayName: "Archives",
    documentation: "Archives data.",
  },
];

describe("relationship documentation generation", () => {
  it("renders deterministic area-grouped Markdown", () => {
    expect(
      renderRelationshipMarkdownTable(relationships),
    ).toBe(`| Area | Kinds |
| --- | --- |
| Connectivity | \`routes\` |
| Data | \`archives\` |`);

    expect(
      renderRelationshipBulletList(relationships),
    ).toBe(`   - Connectivity: \`routes\`
   - Data: \`archives\``);
  });

  it("replaces only the marked generated section", () => {
    const source = `before
<!-- BEGIN GENERATED RELATIONSHIP KINDS -->
stale
<!-- END GENERATED RELATIONSHIP KINDS -->
after`;

    expect(replaceGeneratedRelationshipSection(source, "fresh")).toBe(`before
<!-- BEGIN GENERATED RELATIONSHIP KINDS -->
fresh
<!-- END GENERATED RELATIONSHIP KINDS -->
after`);
  });

  it("keeps checked-in relationship documentation synchronized", () => {
    const guide = readFileSync("docs/guides/relationship-types.md", "utf8");
    const skill = readFileSync(".agents/skills/archlex/SKILL.md", "utf8");

    expect(guide).toContain(
      renderRelationshipMarkdownTable(ARCHLEX_LANGUAGE_METADATA.relationships),
    );
    expect(skill).toContain(
      renderRelationshipBulletList(ARCHLEX_LANGUAGE_METADATA.relationships),
    );
  });
});
