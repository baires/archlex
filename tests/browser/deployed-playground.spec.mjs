import { expect, test } from "@playwright/test";

const PLAYGROUND_URL =
  process.env.PLAYGROUND_URL || "https://playground.archlex.dev";

test("deployed playground loads and renders a diagram", async ({ page }) => {
  await page.goto(PLAYGROUND_URL);

  // Check the page loaded with the correct title
  await expect(page).toHaveTitle(/ArchLex Playground/);

  // Wait for the editor to be visible
  const editor = page.getByRole("textbox");
  await expect(editor).toBeVisible({ timeout: 10000 });

  // Wait for initial diagram to render
  const svg = page.locator("svg[data-archlex-version]");
  await expect(svg).toBeVisible({ timeout: 15000 });

  // Verify the command bar is present
  const commandBar = page.getByRole("banner");
  await expect(commandBar).toBeVisible();

  // Verify export button works
  const exportButton = page.getByRole("button", { name: "Export" });
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeEnabled();

  // Check that the app doesn't have console errors
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  // Wait a bit to collect any errors
  await page.waitForTimeout(2000);

  // Allow specific known warnings but no errors
  const criticalErrors = errors.filter(
    (error) => !error.includes("monaco") && !error.includes("ResizeObserver"),
  );

  expect(criticalErrors).toHaveLength(0);
});

test("deployed playground can render a custom diagram", async ({ page }) => {
  await page.goto(PLAYGROUND_URL);

  const editor = page.getByRole("textbox");
  await expect(editor).toBeVisible({ timeout: 10000 });

  // Clear editor and type new source
  await editor.focus();
  await page.keyboard.press("Control+A");
  await editor.fill(`provider aws
api: lambda
db: dynamodb

api -> db`);

  // Wait for diagram to render
  const svg = page.locator("svg[data-archlex-version]");
  await expect(svg).toBeVisible({ timeout: 15000 });

  // Verify nodes are rendered
  await expect(page.locator('[data-archlex-id="api"]')).toBeVisible();
  await expect(page.locator('[data-archlex-id="db"]')).toBeVisible();
});

test("deployed playground is responsive and accessible", async ({ page }) => {
  await page.goto(PLAYGROUND_URL);

  // Check viewport responsiveness
  await page.setViewportSize({ width: 1024, height: 768 });
  const workspace = page.getByTestId("workspace");
  await expect(workspace).toBeVisible();

  // Check keyboard navigation
  const settingsButton = page.getByRole("button", {
    name: "Diagram settings",
  });
  await settingsButton.click();
  await expect(page.getByLabel("Layout direction")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settingsButton).toBeFocused();
});
