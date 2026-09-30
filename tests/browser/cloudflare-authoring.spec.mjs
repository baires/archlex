import { expect, test } from "@playwright/test";
import {
  installIconFixtureRoutes,
  replaceEditorSource,
} from "./visual-platform.mjs";

test("Workers completion survives diagnostic updates and renders offline", async ({
  page,
}) => {
  await installIconFixtureRoutes(page);
  await page.goto("/");
  await replaceEditorSource(page, "provider cloudflare\napi: ");
  await expect(
    page.getByText("Provider CLOUDFLARE", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /1 error, open diagnostics/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close diagnostics", exact: true })
    .click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("F1");
  await page
    .getByRole("textbox", { name: "Type to narrow down results." })
    .fill(">Trigger Suggest");
  await page.getByText("Trigger Suggest", { exact: true }).click();
  await page
    .locator(".suggest-widget")
    .getByText("Workers", { exact: true })
    .click();
  await expect(page.locator(".editor-pane")).toHaveAttribute(
    "data-test-source",
    "provider cloudflare\napi: workers",
  );
  const previewTab = page.getByRole("tab", { name: "Preview", exact: true });
  if (await previewTab.isVisible()) await previewTab.click();
  await expect(
    page.getByRole("img", { name: "ArchLex Architecture Diagram" }),
  ).toBeVisible();
  await expect(page.locator("svg [aria-label='api (Workers)']")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /errors?, open diagnostics/ }),
  ).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("cloudflare.png") });
});
