import { expect, test } from "@playwright/test";

test("renders the canonical CloudMer chain in Chromium", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "CloudMer" })).toBeVisible();
  await expect(page.getByLabel("CloudMer source")).toHaveValue(
    "rds-proxy > rds > ecs",
  );
  await expect(page.locator('[data-cloudmer-id="rds-proxy"]')).toBeVisible();
  await expect(page.locator('[data-cloudmer-id="rds"]')).toBeVisible();
  await expect(page.locator('[data-cloudmer-id="ecs"]')).toBeVisible();
  await expect(page.locator("svg[data-cloudmer-version]")).toContainText(
    "Amazon RDS Proxy",
  );
  await expect(page.getByTestId("diagnostics")).toContainText("No diagnostics");
});
