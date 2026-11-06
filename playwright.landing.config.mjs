import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "landing.spec.mjs",
  use: { baseURL: "http://127.0.0.1:4322" },
  webServer: {
    command:
      "PUBLIC_GITHUB_URL=https://github.com/example/archlex pnpm --filter @archlex/landing build && ASTRO_PREVIEW_BACKGROUND=1 pnpm --dir apps/landing exec astro preview --host 127.0.0.1 --port 4322",
    port: 4322,
    reuseExistingServer: false,
  },
});
