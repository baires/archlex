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

test("renders toolbar actions with local SVG icons instead of emoji", async ({
  page,
}) => {
  await page.goto("/");
  const toolbar = page.locator(".toolbar");
  const actions = toolbar.getByRole("button");

  await expect(actions).toHaveCount(3);
  await expect(actions.locator("svg[aria-hidden='true']")).toHaveCount(3);
  expect((await toolbar.textContent()) ?? "").not.toMatch(
    /\p{Extended_Pictographic}/u,
  );
});
