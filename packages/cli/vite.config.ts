import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "@cloudmer/core",
        "@cloudmer/model",
        "chalk",
        "commander",
        "ora",
        "playwright",
        "node:fs",
        "node:fs/promises",
        "node:path",
        "node:process",
        "node:url",
      ],
    },
    target: "node22",
    minify: false,
    sourcemap: true,
  },
  plugins: [
    {
      name: "copy-examples",
      writeBundle() {
        // Copy examples directory to dist
        const examplesDir = resolve(__dirname, "examples");
        const distExamplesDir = resolve(__dirname, "dist/examples");

        try {
          mkdirSync(distExamplesDir, { recursive: true });
          const files = readdirSync(examplesDir);

          for (const file of files) {
            if (file.endsWith(".cloudmer")) {
              copyFileSync(
                resolve(examplesDir, file),
                resolve(distExamplesDir, file),
              );
            }
          }
        } catch (error) {
          console.warn("Failed to copy examples:", error);
        }
      },
    },
  ],
});
