#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RelationshipDefinition } from "@archlex/model";
import { ARCHLEX_LANGUAGE_METADATA } from "../packages/core/src/language-metadata.js";

const BEGIN_MARKER = "<!-- BEGIN GENERATED RELATIONSHIP KINDS -->";
const END_MARKER = "<!-- END GENERATED RELATIONSHIP KINDS -->";

function groupedRelationships(
  relationships: readonly RelationshipDefinition[],
): readonly (readonly [string, readonly string[]])[] {
  const groups = new Map<string, string[]>();
  for (const relationship of relationships) {
    const area = relationship.area ?? "other";
    const kinds = groups.get(area) ?? [];
    kinds.push(relationship.kind);
    groups.set(area, kinds);
  }
  return Array.from(groups.entries());
}

function areaLabel(area: string): string {
  return `${area.charAt(0).toUpperCase()}${area.slice(1)}`;
}

export function renderRelationshipMarkdownTable(
  relationships: readonly RelationshipDefinition[],
): string {
  const rows = groupedRelationships(relationships).map(
    ([area, kinds]) =>
      `| ${areaLabel(area)} | ${kinds.map((kind) => `\`${kind}\``).join(", ")} |`,
  );
  return ["| Area | Kinds |", "| --- | --- |", ...rows].join("\n");
}

export function renderRelationshipBulletList(
  relationships: readonly RelationshipDefinition[],
): string {
  return groupedRelationships(relationships)
    .map(
      ([area, kinds]) =>
        `   - ${areaLabel(area)}: ${kinds.map((kind) => `\`${kind}\``).join(", ")}`,
    )
    .join("\n");
}

export function replaceGeneratedRelationshipSection(
  source: string,
  generated: string,
): string {
  const start = source.indexOf(BEGIN_MARKER);
  const end = source.indexOf(END_MARKER);
  if (start < 0 || end < start) {
    throw new Error(
      "Relationship documentation markers are missing or invalid.",
    );
  }
  const contentStart = start + BEGIN_MARKER.length;
  return `${source.slice(0, contentStart)}\n${generated}\n${source.slice(end)}`;
}

async function updateFile(path: string, generated: string): Promise<void> {
  const source = await readFile(path, "utf8");
  const updated = replaceGeneratedRelationshipSection(source, generated);
  if (updated !== source) {
    await writeFile(path, updated);
  }
}

export async function generateRelationshipDocs(): Promise<void> {
  const relationships = ARCHLEX_LANGUAGE_METADATA.relationships;
  await updateFile(
    resolve("docs/guides/relationship-types.md"),
    renderRelationshipMarkdownTable(relationships),
  );
  await updateFile(
    resolve(".agents/skills/archlex/SKILL.md"),
    renderRelationshipBulletList(relationships),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await generateRelationshipDocs();
  console.log("✓ Generated relationship vocabulary documentation");
}
