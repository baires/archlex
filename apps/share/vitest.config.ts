import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = resolve(import.meta.dirname, "../..");

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@archlex/model": resolve(root, "packages/model/src/index.ts"),
      "@archlex/parser": resolve(root, "packages/parser/src/index.ts"),
      "@archlex/diagnostics": resolve(
        root,
        "packages/diagnostics/src/index.ts",
      ),
      "@archlex/aws": resolve(root, "packages/aws/src/index.ts"),
      "@archlex/gcp": resolve(root, "packages/gcp/src/index.ts"),
      "@archlex/k8s": resolve(root, "packages/k8s/src/index.ts"),
      "@archlex/icons-core": resolve(root, "packages/icons-core/src/index.ts"),
      "@archlex/layout-elk": resolve(root, "packages/layout-elk/src/index.ts"),
      "@archlex/renderer-svg": resolve(
        root,
        "packages/renderer-svg/src/index.ts",
      ),
      "@archlex/core": resolve(root, "packages/core/src/index.ts"),
    },
  },
});
