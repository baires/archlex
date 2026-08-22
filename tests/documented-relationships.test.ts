import { readFileSync } from "node:fs";
import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { gcpProvider } from "@archlex/gcp";
import { k8sProvider } from "@archlex/k8s";
import { describe, expect, it } from "vitest";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
});

const archlexDocuments = [
  "packages/cli/examples/aws-serverless-api.archlex",
  "packages/cli/examples/k8s-microservices.archlex",
  "packages/cli/examples/gcp-microservices.archlex",
];

const markdownDocuments = [
  "README.md",
  "apps/docs/pages/getting-started.mdx",
  ".agents/skills/archlex/references/examples.md",
];

function archlexBlocks(source: string): readonly string[] {
  return Array.from(
    source.matchAll(/```archlex\n([\s\S]*?)```/g),
    ([, block]) => block.trim(),
  );
}

function expectKnownRelationships(source: string, label: string): void {
  const diagnostics = archlex.analyze(archlex.parse(source).ast).diagnostics;
  const unknown = diagnostics.filter(
    ({ code }) => code === "AL-SEM-UNKNOWN-RELATIONSHIP",
  );
  expect(
    unknown,
    `${label}: ${unknown.map(({ message }) => message).join("; ")}`,
  ).toHaveLength(0);
}

describe("documented ArchLex relationships", () => {
  it("uses recognized relationship kinds in shipped ArchLex files", () => {
    for (const file of archlexDocuments) {
      expectKnownRelationships(readFileSync(file, "utf8"), file);
    }
  });

  it("uses recognized relationship kinds in documented ArchLex blocks", () => {
    for (const file of markdownDocuments) {
      const blocks = archlexBlocks(readFileSync(file, "utf8"));
      expect(
        blocks.length,
        `${file} should contain ArchLex examples`,
      ).toBeGreaterThan(0);
      for (const [index, block] of blocks.entries()) {
        expectKnownRelationships(block, `${file} block ${index + 1}`);
      }
    }
  });
});
