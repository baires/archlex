import { expect, test } from "@playwright/test";

test("browse, filter, preview, and load without changing source during selection", async ({
  page,
}) => {
  await page.goto("/");
  const originalSource = await page.evaluate(() =>
    localStorage.getItem("archlex_source_v1"),
  );
  await page.getByRole("button", { name: "Explore examples" }).click();
  const dialog = page.getByRole("dialog", { name: "Explore examples" });
  await expect(page.getByRole("searchbox")).toBeFocused();
  await dialog
    .getByRole("button", { name: "Google Cloud", exact: true })
    .click();
  await expect(
    dialog.locator(".example-browser__result").first(),
  ).toContainText("Google Cloud");
  await dialog.getByRole("button", { name: "AWS", exact: true }).click();
  await page.getByRole("searchbox").fill("lambda dynamodb");
  await dialog
    .getByRole("button", { name: /^Serverless Microservice/ })
    .click();
  await expect(dialog.getByRole("img")).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("archlex_source_v1"),
  );
  expect(before).toBe(originalSource);
  await dialog.getByRole("button", { name: "Load example" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close examples" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Load example" }).click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("archlex_source_v1")))
    .toContain("api-gateway -[invokes]-> lambda");
  expect(before).not.toContain("api-gateway -[invokes]-> lambda");
  await expect(
    page.getByRole("button", { name: "Explore examples" }),
  ).toBeFocused();
});

test("empty state, filter recovery, and Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore examples" }).click();
  await page.getByRole("searchbox").fill("zzzz-no-results");
  await expect(page.getByText("No matching examples")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".example-browser__result")).toHaveCount(36);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("mobile preview has a return path", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore examples" }).click();
  await page.locator(".example-browser__result").first().click();
  await expect(
    page.getByRole("button", { name: "Load example" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to examples" }).click();
  await expect(page.locator(".example-browser__result").first()).toBeVisible();
});

test("a single filtered result uses a compact content-sized dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore examples" }).click();
  await page
    .getByLabel("Use case", { exact: true })
    .selectOption("Stateful Workloads");
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(640);
  expect(bounds.height).toBeLessThan(450);
  await expect(
    page.getByRole("region", { name: "Architecture preview" }),
  ).not.toBeVisible();
});
