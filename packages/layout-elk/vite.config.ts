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
      // @archlex/model is bundled so the built module has one less bare
      // specifier; elkjs stays external for code splitting and lazy loading.
      external: ["elkjs/lib/elk.bundled.js", "elkjs/lib/elk-worker.min.js"],
      output: {
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          // Keep ELK-related imports separate for lazy loading
          if (id.includes("elkjs")) {
            return "elk-vendor";
          }
        },
      },
    },
    // Production optimizations
    minify: "esbuild",
    target: "es2020",
    // Enable source maps for production debugging
    sourcemap: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["@archlex/model"],
  },
});
