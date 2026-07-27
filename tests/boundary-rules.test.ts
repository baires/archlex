import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dependency Boundary Rules", () => {
  const rootDir = path.resolve(__dirname, "..");
  const matrix: Record<string, string[]> = {
    model: [],
    parser: ["@cloudmer/model", "chevrotain"],
    aws: ["@cloudmer/model"],
    "layout-elk": ["@cloudmer/model", "elkjs"],
    "renderer-svg": ["@cloudmer/model"],
    core: [
      "@cloudmer/aws",
      "@cloudmer/layout-elk",
      "@cloudmer/model",
      "@cloudmer/parser",
      "@cloudmer/renderer-svg",
    ],
  };

  for (const [pkgName, allowedDeps] of Object.entries(matrix)) {
    it(`package @cloudmer/${pkgName} respects dependency boundaries`, () => {
      const pkgJsonPath = path.join(
        rootDir,
        "packages",
        pkgName,
        "package.json",
      );
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

      const deps = Object.keys(pkgJson.dependencies || {});
      for (const dep of deps) {
        expect(allowedDeps).toContain(dep);
      }
    });
  }

  it("parser does not depend on provider, layout, or renderer", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(
        path.join(rootDir, "packages/parser/package.json"),
        "utf-8",
      ),
    );
    const deps = Object.keys(pkgJson.dependencies || {});
    expect(deps).not.toContain("@cloudmer/aws");
    expect(deps).not.toContain("@cloudmer/layout-elk");
    expect(deps).not.toContain("@cloudmer/renderer-svg");
  });

  it("layout and renderer do not depend on parser or provider", () => {
    const layoutPkg = JSON.parse(
      fs.readFileSync(
        path.join(rootDir, "packages/layout-elk/package.json"),
        "utf-8",
      ),
    );
    const renderPkg = JSON.parse(
      fs.readFileSync(
        path.join(rootDir, "packages/renderer-svg/package.json"),
        "utf-8",
      ),
    );

    const layoutDeps = Object.keys(layoutPkg.dependencies || {});
    const renderDeps = Object.keys(renderPkg.dependencies || {});

    expect(layoutDeps).not.toContain("@cloudmer/parser");
    expect(layoutDeps).not.toContain("@cloudmer/aws");

    expect(renderDeps).not.toContain("@cloudmer/parser");
    expect(renderDeps).not.toContain("@cloudmer/aws");
  });
});
