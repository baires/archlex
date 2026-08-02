import { expect, test } from "@playwright/test";

test("leads with a real product render and playground action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Write the architecture. We’ll check it.",
  );
  await expect(
    page.getByRole("link", { name: /try the playground/i }).first(),
  ).toHaveAttribute("href", /playground/);
  await expect(page.getByRole("link", { name: /view source/i })).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /multi-region AWS architecture rendered by ArchLex/i,
    }),
  ).toBeVisible();
});

test("fits the complete product hero inside a desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const frame = page.locator(".hero .product-frame");
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  await expect(frame.locator("img")).toHaveCSS("object-fit", "contain");
});

test("explains semantics and provides a verified quick start", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /diagrams should understand/i }),
  ).toBeVisible();
  await expect(page.getByText(/actionable diagnostics/i).first()).toBeVisible();
  await expect(
    page.getByText("npm install @archlex/core @archlex/aws @archlex/gcp"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /architecture already lives in code/i }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`has no horizontal overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expect(
      page.getByRole("link", { name: /open playground/i }).first(),
    ).toBeVisible();
  });
}

test("supports keyboard skip navigation and reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator(".hero__copy")).toHaveCSS(
    "animation-duration",
    "0s",
  );
  await context.close();
});

test("uses the configured GitHub destination", async ({ page }) => {
  await page.goto("/");
  const githubLink = page.getByRole("link", { name: /view source/i });
  await expect(githubLink).toHaveAttribute(
    "href",
    "https://github.com/example/archlex",
  );
  await expect(githubLink).toHaveAttribute("target", "_blank");
  await expect(githubLink).toHaveAttribute("rel", /noreferrer/);
});
