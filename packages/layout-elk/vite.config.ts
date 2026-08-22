import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isBrowserBuild = mode === "browser";
  const entryName = isBrowserBuild ? "browser" : "index";

  return {
    resolve: {
      alias: isBrowserBuild
        ? {
            "./elk-loader.js": resolve(__dirname, "src/elk-loader.browser.ts"),
          }
        : undefined,
    },
    build: {
      emptyOutDir: !isBrowserBuild,
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["es"],
        fileName: entryName,
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("elkjs")) {
              return isBrowserBuild ? "elk-browser" : "elk-node";
            }
          },
        },
      },
      minify: "esbuild",
      target: "es2020",
      sourcemap: true,
    },
    optimizeDeps: {
      include: ["@archlex/model"],
    },
  };
});
