import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "landing.spec.mjs",
  use: { baseURL: "http://127.0.0.1:4322" },
  webServer: {
    command:
      "pnpm --filter @archlex/landing build && pnpm --filter @archlex/landing preview --host 127.0.0.1 --port 4322",
    port: 4322,
    reuseExistingServer: false,
  },
});
