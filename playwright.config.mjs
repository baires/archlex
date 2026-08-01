import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command:
      "pnpm turbo build --filter=@archlex/playground... && pnpm --filter @archlex/playground preview",
    port: 4173,
    reuseExistingServer: false,
  },
});
