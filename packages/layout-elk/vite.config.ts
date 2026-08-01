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
      // specifier; elkjs stays external for worker bundling flexibility.
      external: ["elkjs"],
    },
  },
});
