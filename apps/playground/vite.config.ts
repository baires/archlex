import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude @archlex/icons from optimization since it contains Node.js-only code
    // that cannot run in the browser (file system, crypto, etc.)
    exclude: ["@archlex/icons"],
  },
  build: {
    rollupOptions: {
      // Mark @archlex/icons as external to prevent bundling Node.js modules
      external: ["@archlex/icons"],
    },
  },
});
