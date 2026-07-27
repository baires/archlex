import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        browser: resolve(__dirname, "src/browser.ts"),
      },
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        "@cloudmer/model",
        "@cloudmer/parser",
        "@cloudmer/aws",
        "@cloudmer/layout-elk",
        "@cloudmer/renderer-svg",
      ],
    },
  },
});
