import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AnnotationsSchema,
  IconSchema,
  ToolSchema,
} from "@modelcontextprotocol/core";
import { describe, expect, test } from "vitest";
import { lastModifiedForSource } from "../../scripts/sync-docs.mjs";
import { listResources, listTools } from "../../src/registry.js";

function decodedDataUri(src: string): Uint8Array {
  const prefix = "data:image/png;base64,";
  expect(src.startsWith(prefix)).toBe(true);
  return Uint8Array.from(Buffer.from(src.slice(prefix.length), "base64"));
}

describe("optional presentation metadata", () => {
  test("publishes bounded schema-valid PNG tool icons with accurate behavior hints", () => {
    const tools = listTools({ enableMcpApps: false });
    expect(tools.every((tool) => ToolSchema.safeParse(tool).success)).toBe(
      true,
    );

    for (const tool of tools) {
      expect(tool.icons).toHaveLength(1);
      const icon = tool.icons?.[0];
      expect(IconSchema.safeParse(icon).success).toBe(true);
      expect(icon?.mimeType).toBe("image/png");
      expect(icon?.src.length).toBeLessThan(16_000);
      expect(decodedDataUri(icon?.src ?? "").slice(0, 8)).toEqual(
        Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      });
    }
    expect(
      tools.find((tool) => tool.name === "render_diagram")?.annotations,
    ).toMatchObject({ openWorldHint: true });
    expect(
      tools.find((tool) => tool.name === "validate_diagram")?.annotations,
    ).toMatchObject({ openWorldHint: false });
  });

  test("derives document modification time from Git and leaves some resources unannotated", () => {
    const resources = listResources();
    const guide = resources.find(
      (resource) => resource.uri === "archlex://docs/specs/language",
    );
    const expectedLastModified = execFileSync(
      "git",
      ["log", "-1", "--format=%aI", "--", "docs/specs/language.md"],
      { cwd: new URL("../../../../", import.meta.url), encoding: "utf8" },
    ).trim();

    expect(AnnotationsSchema.safeParse(guide?.annotations).success).toBe(true);
    expect(guide?.annotations).toEqual({
      audience: ["user", "assistant"],
      lastModified: expectedLastModified,
    });
    expect(
      guide?.icons?.every((icon) => IconSchema.safeParse(icon).success),
    ).toBe(true);
    expect(
      resources.find(
        (resource) => resource.uri === "archlex://docs/guides/mcp-server",
      )?.description,
    ).toBe(
      "Connect MCP clients to the remote ArchLex MCP server to render, validate, inspect, and share AWS, Google Cloud, and Kubernetes diagrams.",
    );
    expect(
      resources.find(
        (resource) => resource.uri === "archlex://examples/aws-microservices",
      ),
    ).not.toHaveProperty("annotations");
  });

  test("omits stale timestamps for dirty, untracked, and non-Git sources", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "archlex-doc-metadata-"));
    const nonGit = mkdtempSync(path.join(tmpdir(), "archlex-doc-source-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: repo });
      execFileSync("git", ["config", "user.email", "test@archlex.dev"], {
        cwd: repo,
      });
      execFileSync("git", ["config", "user.name", "ArchLex Test"], {
        cwd: repo,
      });
      const tracked = path.join(repo, "tracked.md");
      writeFileSync(tracked, "# Tracked\n", "utf8");
      execFileSync("git", ["add", "tracked.md"], { cwd: repo });
      execFileSync("git", ["commit", "-q", "-m", "add tracked doc"], {
        cwd: repo,
      });
      expect(lastModifiedForSource(tracked, "# Tracked\n", repo)).toMatch(
        /^\d{4}-\d{2}-\d{2}T/,
      );

      appendFileSync(tracked, "dirty\n", "utf8");
      expect(lastModifiedForSource(tracked, "# Tracked\ndirty\n", repo)).toBe(
        undefined,
      );
      const untracked = path.join(repo, "untracked.md");
      writeFileSync(untracked, "# Untracked\n", "utf8");
      expect(lastModifiedForSource(untracked, "# Untracked\n", repo)).toBe(
        undefined,
      );

      const sourceOnly = path.join(nonGit, "source.md");
      const sourceMetadata =
        "---\nlastModified: 2026-08-22T14:00:00-03:00\n---\n# Source\n";
      writeFileSync(sourceOnly, sourceMetadata, "utf8");
      expect(lastModifiedForSource(sourceOnly, sourceMetadata, nonGit)).toBe(
        "2026-08-22T14:00:00-03:00",
      );
      expect(
        lastModifiedForSource(
          sourceOnly,
          "---\nlastModified: 2026-08-22\n---\n# Source\n",
          nonGit,
        ),
      ).toBe(undefined);
      expect(
        lastModifiedForSource(
          sourceOnly,
          "---\nlastModified: yesterday\n---\n# Source\n",
          nonGit,
        ),
      ).toBe(undefined);
      expect(lastModifiedForSource(sourceOnly, "# Source\n", nonGit)).toBe(
        undefined,
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(nonGit, { recursive: true, force: true });
    }
  });
});
