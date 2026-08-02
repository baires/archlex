import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("shared design adoption", () => {
  test.each([
    ["playground", "apps/playground/src/main.tsx"],
    ["docs", "apps/docs/pages/_app.tsx"],
  ])("%s imports @archlex/design", async (_app, entry) => {
    const source = await readFile(entry, "utf8");
    expect(source).toContain('import "@archlex/design"');
  });
});
