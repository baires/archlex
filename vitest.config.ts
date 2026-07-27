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
      "@cloudmer/model": resolve(__dirname, "./packages/model/src/index.ts"),
      "@cloudmer/parser": resolve(__dirname, "./packages/parser/src/index.ts"),
      "@cloudmer/aws": resolve(__dirname, "./packages/aws/src/index.ts"),
      "@cloudmer/layout-elk": resolve(
        __dirname,
        "./packages/layout-elk/src/index.ts",
      ),
      "@cloudmer/renderer-svg": resolve(
        __dirname,
        "./packages/renderer-svg/src/index.ts",
      ),
      "@cloudmer/core/browser": resolve(
        __dirname,
        "./packages/core/src/browser.ts",
      ),
      "@cloudmer/core": resolve(__dirname, "./packages/core/src/index.ts"),
    },
  },
});
