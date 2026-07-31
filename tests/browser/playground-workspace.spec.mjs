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
