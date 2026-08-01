import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@archlex/model": resolve(__dirname, "./packages/model/src/index.ts"),
      "@archlex/parser": resolve(__dirname, "./packages/parser/src/index.ts"),
      "@archlex/aws": resolve(__dirname, "./packages/aws/src/index.ts"),
      "@archlex/gcp": resolve(__dirname, "./packages/gcp/src/index.ts"),
      "@archlex/icons-browser": resolve(
        __dirname,
        "./packages/icons-browser/src/index.ts",
      ),
      "@archlex/icons-core": resolve(
        __dirname,
        "./packages/icons-core/src/index.ts",
      ),
      "@archlex/icons-node": resolve(
        __dirname,
        "./packages/icons-node/src/index.ts",
      ),
      "@archlex/layout-elk": resolve(
        __dirname,
        "./packages/layout-elk/src/index.ts",
      ),
      "@archlex/renderer-svg": resolve(
        __dirname,
        "./packages/renderer-svg/src/index.ts",
      ),
      "@archlex/core/browser": resolve(
        __dirname,
        "./packages/core/src/browser.ts",
      ),
      "@archlex/core": resolve(__dirname, "./packages/core/src/index.ts"),
    },
  },
});
