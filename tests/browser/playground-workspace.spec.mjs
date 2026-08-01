import { expect, test } from "@playwright/test";

const WARNING_SOURCE = `provider aws
subnet orphan {
  api: ecs
}`;
const MULTI_WARNING_SOURCE = `provider aws
subnet first {
  api: ecs
}
subnet second {
  worker: lambda
}`;
const ERROR_SOURCE = `provider gcp
region broken {
  node: gke`;
const SECOND_ERROR_SOURCE = `provider aws
vpc incomplete {
  api: ecs`;
const CLEAN_SOURCE = `provider aws
api: ecs`;
const MIXED_SOURCE = `provider aws
subnet orphan {
  api: ecs
}
source -[streams]-> sink`;

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

test("supports a persisted keyboard-resizable 40/60 workspace", async ({
  page,
}) => {
  await page.goto("/");
  const workspace = page.getByTestId("workspace");
  const separator = page.getByRole("separator", {
    name: "Resize editor and preview",
  });
  await expect(separator).toHaveAttribute("aria-valuenow", "40");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "42");
  await page.reload();
  await expect(
    page.getByRole("separator", { name: "Resize editor and preview" }),
  ).toHaveAttribute("aria-valuenow", "42");
  await expect(workspace).toBeVisible();
});

test("supports pointer-resizable editor width", async ({ page }) => {
  await page.goto("/");
  const workspace = page.getByTestId("workspace");
  const separator = page.getByRole("separator", {
    name: "Resize editor and preview",
  });
  const bounds = await workspace.boundingBox();

  if (!bounds) throw new Error("Workspace is not visible");

  await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + 80);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + 80);
  await page.mouse.up();

  await expect(separator).toHaveAttribute("aria-valuenow", "60");
});

test("uses editor and preview tabs on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Editor" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("tabpanel", { name: "Preview" })).toBeVisible();
  await page.getByRole("tab", { name: "Preview" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Editor" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("separator")).toHaveCount(0);
});

test("fullscreen preview preserves workspace and canvas state", async ({
  page,
}) => {
  await page.goto("/");
  const separator = page.getByRole("separator", {
    name: "Resize editor and preview",
  });
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Actual size" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();

  await page.getByRole("button", { name: "Enter fullscreen preview" }).click();
  await expect(page.getByTestId("workspace")).toHaveClass(/is-fullscreen/);
  await expect(
    page.getByRole("button", { name: "Exit fullscreen preview" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByLabel("Zoom level")).toHaveText("110%");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("workspace")).not.toHaveClass(/is-fullscreen/);
  await expect(separator).toHaveAttribute("aria-valuenow", "42");
  await expect(page.getByLabel("Zoom level")).toHaveText("110%");
});

test("falls back to in-app fullscreen when the browser request rejects", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new Error("denied"));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Enter fullscreen preview" }).click();
  await expect(page.getByTestId("workspace")).toHaveAttribute(
    "data-fullscreen-mode",
    "in-app",
  );
  await expect(
    page.getByRole("button", { name: "Exit fullscreen preview" }),
  ).toBeVisible();
});

test("keeps warnings quiet and opens diagnostics for errors", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox");
  await editor.fill(WARNING_SOURCE);
  await expect(page.getByRole("button", { name: /1 warning/ })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toHaveCount(
    0,
  );

  await editor.fill(ERROR_SOURCE);
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toBeVisible();
  await expect(editor).toBeFocused();

  await page.getByRole("button", { name: "Close diagnostics" }).click();
  await editor.fill(SECOND_ERROR_SOURCE);
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toHaveCount(
    0,
  );

  await editor.fill(CLEAN_SOURCE);
  await expect(
    page.getByRole("button", { name: /error.*open diagnostics/ }),
  ).toHaveCount(0);
  await editor.fill(ERROR_SOURCE);
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toBeVisible();
});

test("filters and navigates compact diagnostic rows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill(WARNING_SOURCE);
  await page.getByRole("button", { name: /1 warning/ }).click();
  const drawer = page.getByRole("dialog", { name: "Diagnostics" });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByText(/AWS-NETWORKING-SUBNET-CONTAINMENT-001/),
  ).toBeVisible();
  const row = drawer.getByRole("option").first();
  await row.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect
    .poll(() =>
      page.getByRole("textbox").evaluate((element) => ({
        start: element.selectionStart,
        end: element.selectionEnd,
      })),
    )
    .toEqual({ start: 0, end: 0 });
  await expect(page.locator("svg [data-cloudmer-id].selected")).toHaveCount(1);
  await row.focus();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("button", { name: /warning/ })).toBeFocused();
});

test("moves diagnostic focus and expands remediation without selecting", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox").fill(MULTI_WARNING_SOURCE);
  const trigger = page.getByRole("button", {
    name: /2 warnings, open diagnostics/,
  });
  await trigger.click();

  const drawer = page.getByRole("dialog", { name: "Diagnostics" });
  const rows = drawer.getByRole("option");
  await expect(rows).toHaveCount(2);
  await page.getByRole("button", { name: "Close diagnostics" }).focus();
  await page.keyboard.press("Tab");
  await expect(rows.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(1)).toBeFocused();

  await expect(rows.nth(1).getByRole("button")).toHaveCount(0);
  const remediation = drawer
    .getByRole("button", {
      name: "Show remediation",
    })
    .nth(1);
  await remediation.click();
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
  await expect(
    drawer.getByText(/Nest the subnet block inside a vpc block/),
  ).toBeVisible();

  await drawer.getByRole("button", { name: "Hide remediation" }).focus();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("changes diagnostic filters and synchronizes source-only diagnostics", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox");
  await editor.fill(MIXED_SOURCE);
  await page
    .getByRole("button", { name: /1 warning, open diagnostics/ })
    .click();

  const drawer = page.getByRole("dialog", { name: "Diagnostics" });
  await expect(drawer.getByRole("option")).toHaveCount(1);
  await drawer.getByRole("button", { name: "Info", exact: true }).click();
  await expect(drawer.getByRole("option")).toHaveCount(4);
  await expect(
    drawer.getByText(/CM-SEM-UNKNOWN-RESOURCE/).first(),
  ).toBeVisible();
  await expect(
    drawer.getByText(/AWS-NETWORKING-SUBNET-CONTAINMENT-001/),
  ).toHaveCount(0);

  await editor.fill(ERROR_SOURCE);
  const errorDrawer = page.getByRole("dialog", { name: "Diagnostics" });
  await expect(errorDrawer.getByText(/CM-PARSE-MISSING-BRACE/)).toBeVisible();
  const sourceOnlyRow = errorDrawer.getByRole("option").first();
  await sourceOnlyRow.focus();
  await page.keyboard.press("Space");
  await expect(editor).toBeFocused();
  await expect
    .poll(() =>
      editor.evaluate((element) => ({
        start: element.selectionStart,
        end: element.selectionEnd,
      })),
    )
    .toEqual({ start: 0, end: 0 });
  await expect(page.locator("svg [data-cloudmer-id].selected")).toHaveCount(0);
});
