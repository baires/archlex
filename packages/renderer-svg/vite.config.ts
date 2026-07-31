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
      // @cloudmer/model is bundled so the built module stays self-contained
      // for browser consumers that load dist directly (no bare specifiers).
      external: [],
    },
  },
});
