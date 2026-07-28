import { expect, test } from "@playwright/test";

test("renders the canonical CloudMer chain in Chromium", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "CloudMer" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue(
    `direction LR
provider aws
validation normal

rds-proxy > rds > ecs`,
  );
  await expect(page.locator('[data-cloudmer-id="rds-proxy"]')).toBeVisible();
  await expect(page.locator('[data-cloudmer-id="rds"]')).toBeVisible();
  await expect(page.locator('[data-cloudmer-id="ecs"]')).toBeVisible();
  await expect(page.locator("svg[data-cloudmer-version]")).toContainText(
    "Amazon RDS Proxy",
  );
  await expect(page.getByTestId("diagnostics")).toContainText("0 diagnostics");
});

test("renders resources nested inside account boundaries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill(`direction LR
provider aws
validation normal

account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        proxy: rds-proxy
        db: rds
        proxy > db
      }
    }
  }
}`);

  await expect(page.locator("svg[data-cloudmer-version]")).toBeVisible();
  await expect(page.locator('g[data-cloudmer-id$="/proxy"]')).toBeVisible();
  await expect(page.locator('g[data-cloudmer-id$="/db"]')).toBeVisible();
  await expect(page.locator(".cloudmer-scope")).toHaveCount(4);
});
