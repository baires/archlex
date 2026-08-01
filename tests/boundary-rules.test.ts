import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dependency Boundary Rules", () => {
  const rootDir = path.resolve(__dirname, "..");
  const matrix: Record<string, string[]> = {
    model: [],
    parser: ["@archlex/diagnostics", "@archlex/model", "chevrotain"],
    aws: ["@archlex/model", "@archlex/icons", "@archlex/icons-core"],
    gcp: ["@archlex/model", "@archlex/icons", "@archlex/icons-core"],
    "layout-elk": ["@archlex/model", "elkjs"],
    "renderer-svg": ["@archlex/model"],
    core: [
      "@archlex/aws",
      "@archlex/diagnostics",
      "@archlex/gcp",
      "@archlex/icons-core",
      "@archlex/layout-elk",
      "@archlex/model",
      "@archlex/parser",
      "@archlex/renderer-svg",
    ],
  };

  for (const [pkgName, allowedDeps] of Object.entries(matrix)) {
    it(`package @archlex/${pkgName} respects dependency boundaries`, () => {
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
    expect(deps).not.toContain("@archlex/aws");
    expect(deps).not.toContain("@archlex/layout-elk");
    expect(deps).not.toContain("@archlex/renderer-svg");
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

    expect(layoutDeps).not.toContain("@archlex/parser");
    expect(layoutDeps).not.toContain("@archlex/aws");

    expect(renderDeps).not.toContain("@archlex/parser");
    expect(renderDeps).not.toContain("@archlex/aws");
  });
});
