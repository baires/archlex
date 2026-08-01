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
        "@xmldom/xmldom",
        "node:crypto",
        "node:fs",
        "node:fs/promises",
        "node:os",
        "node:path",
      ],
    },
  },
});
