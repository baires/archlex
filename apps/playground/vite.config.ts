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
      output: {
        // Manual chunks for better code splitting and caching
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes("node_modules")) {
            // Separate ELK into its own chunk for lazy loading
            if (id.includes("elkjs")) {
              return "elk";
            }
            // Monaco editor in separate chunk (large)
            if (id.includes("monaco-editor")) {
              return "monaco";
            }
            // React libraries
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            // Other vendor code
            return "vendor";
          }
          // Separate archlex packages for granular updates
          if (id.includes("@archlex")) {
            if (id.includes("layout-elk")) {
              return "archlex-layout";
            }
            if (id.includes("icons")) {
              return "archlex-icons";
            }
            return "archlex-core";
          }
        },
      },
    },
    // Production optimizations
    minify: "esbuild",
    target: "es2020",
    cssMinify: true,
    // Enable source maps for debugging
    sourcemap: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
  },
  // Server compression
  server: {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },
});
