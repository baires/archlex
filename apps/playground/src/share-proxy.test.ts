import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("playground share proxy", () => {
  it("forwards share API and image routes to the local share worker", () => {
    const config = readFileSync(
      new URL("../vite.config.ts", import.meta.url),
      "utf8",
    );

    expect(config).toContain('"/v1": "http://127.0.0.1:8789"');
    expect(config).toContain('"^/s/": "http://127.0.0.1:8789"');
  });
});
