import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command:
      "pnpm turbo build --filter=@cloudmer/playground... && pnpm --filter @cloudmer/playground preview",
    port: 4173,
    reuseExistingServer: false,
  },
});
