import { expect, test } from "@playwright/test";

test("uses the operations-console visual foundation", async ({ page }) => {
  await page.goto("/");
  const body = page.locator("body");
  await expect(body).toHaveCSS("font-family", /IBM Plex Sans/);
  const styles = await page
    .locator("style, link[rel=stylesheet]")
    .evaluateAll(async (nodes) =>
      (
        await Promise.all(
          nodes.map(async (node) => {
            if (node.tagName === "STYLE") return node.textContent ?? "";
            const response = await fetch(node.href);
            return response.text();
          }),
        )
      ).join("\n"),
    );
  expect(styles).not.toMatch(/backdrop-filter|linear-gradient|radial-gradient/);
});

test("groups infrequent actions without hiding core configuration", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toHaveClass(/command-bar/);
  await expect(page.getByLabel("Example")).toBeVisible();
  await expect(page.getByLabel("Layout direction")).toBeVisible();
  await expect(page.getByLabel("Validation mode")).toBeVisible();
  await expect(page.locator(".toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy SVG" })).toHaveCount(0);

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("menuitem", { name: "Copy SVG" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Download SVG" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Copy SVG" })).toHaveCount(0);
});

test("keeps the command bar compact and supports Export menu keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");

  const commandBar = page.getByRole("banner");
  const commandBarHeight = await commandBar.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(commandBarHeight).toBeGreaterThanOrEqual(44);
  expect(commandBarHeight).toBeLessThanOrEqual(48);

  const exportTrigger = page.getByRole("button", { name: "Export" });
  await expect(exportTrigger).toBeEnabled();
  await exportTrigger.click();

  const copySvg = page.getByRole("menuitem", { name: "Copy SVG" });
  const downloadSvg = page.getByRole("menuitem", { name: "Download SVG" });
  await expect(copySvg).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(downloadSvg).toBeFocused();
  await page.keyboard.press("Home");
  await expect(copySvg).toBeFocused();
  await page.keyboard.press("End");
  await expect(downloadSvg).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(exportTrigger).toBeFocused();
  await expect(copySvg).toHaveCount(0);
});

test("retains the current SVG while a command change is rendering", async ({
  page,
}) => {
  await page.goto("/");

  const renderedSvg = page.locator("svg[data-cloudmer-version]");
  await expect(renderedSvg).toBeVisible();

  await page.getByLabel("Layout direction").selectOption("TB");
  await expect(page.locator(".render-metadata")).toContainText("Rendering");
  await expect(renderedSvg).toBeVisible();
  await expect(page.locator(".render-metadata")).toContainText("Ready");
});
