import { expect, test } from "@playwright/test";

test("leads with a real product render and playground action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("cloud");
  await expect(
    page.getByRole("link", { name: /open playground/i }).first(),
  ).toHaveAttribute("href", /playground/);
  await expect(
    page.getByRole("img", {
      name: /multi-region AWS architecture rendered by ArchLex/i,
    }),
  ).toBeVisible();
});
