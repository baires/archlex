import { readFile } from "node:fs/promises";

const ICON_FIXTURE = await readFile(
  new URL("../fixtures/icons/runtime-service.svg", import.meta.url),
  "utf8",
);

export function visualSnapshotsSupported(platform = process.platform) {
  return platform === "darwin";
}

export async function installIconFixtureRoutes(page) {
  await page.route(
    /https:\/\/(?:unpkg\.com|raw\.githubusercontent\.com)\//,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: ICON_FIXTURE,
      }),
  );
}

export async function replaceEditorSource(page, source) {
  const editor = page.getByRole("textbox", { name: "Source", exact: true });
  await editor.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(source);
}
