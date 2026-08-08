import { expect, test } from "@playwright/test";

test("leads with a real diagram and playground action", async ({ page }) => {
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
      name: /multi-region cloud architecture rendered by ArchLex/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /multi-region cloud architecture rendered by ArchLex/i,
    }),
  ).toHaveAttribute("src", /\.svg$/);
  await expect(page.getByText("SYS.ARCH / 001")).toHaveCount(0);
  await expect(page.locator(".hero .product-frame")).toHaveCount(0);
});

test("fits the complete diagram hero inside a desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const diagram = page.locator(".hero-diagram");
  const box = await diagram.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  await expect(diagram.locator("img")).toHaveCSS("object-fit", "contain");
});

test("uses compact bordered spacing between product sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const section = page.locator(".section").first();
  const styles = await section.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      paddingTop: Number.parseFloat(computed.paddingTop),
      borderTopWidth: computed.borderTopWidth,
      borderTopStyle: computed.borderTopStyle,
    };
  });
  expect(styles.paddingTop).toBeLessThanOrEqual(112);
  expect(styles.borderTopWidth).toBe("1px");
  expect(styles.borderTopStyle).toBe("solid");
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
  await expect(
    page.getByRole("img", {
      name: /api gateway invokes lambda which writes to dynamodb/i,
    }),
  ).toHaveAttribute("src", /\.svg$/);
  await expect(page.getByText("SEMANTIC LAYER", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator(".code-window .token--keyword")).not.toHaveCount(0);
  await expect(page.locator(".code-window .token--string")).not.toHaveCount(0);
  await expect(page.locator(".code-window .token--function")).not.toHaveCount(
    0,
  );
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

test("switches MCP clients with tabs and arrow keys", async ({ page }) => {
  await page.goto("/");
  const mcp = page.locator("#mcp");
  const codex = mcp.getByRole("tab", { name: "Codex" });
  const claude = mcp.getByRole("tab", { name: "Claude Code" });

  await expect(codex).toHaveAttribute("aria-selected", "true");
  await codex.focus();
  await page.keyboard.press("ArrowRight");
  await expect(claude).toBeFocused();
  await expect(claude).toHaveAttribute("aria-selected", "true");
  await expect(
    mcp.getByRole("tabpanel", { name: "Claude Code" }),
  ).toBeVisible();
  await expect(mcp.getByRole("tabpanel", { name: "Codex" })).toBeHidden();
});

test("copies setup text and announces success", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const mcp = page.locator("#mcp");
  await mcp.getByRole("button", { name: /copy codex setup/i }).click();

  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "codex mcp add archlex --url https://mcp.archlex.dev/mcp",
  );
  await expect(mcp.getByRole("status")).toHaveText(/codex setup copied/i);
});

test("selects setup text when clipboard access fails", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
  });
  await page.goto("/");
  const mcp = page.locator("#mcp");
  await mcp.getByRole("button", { name: /copy codex setup/i }).click();

  await expect(mcp.getByRole("status")).toHaveText(/selected.*copy manually/i);
  expect(
    await page.evaluate(() => window.getSelection()?.toString()),
  ).toContain("codex mcp add archlex");
});

test("presents MCP as the fourth product pillar", async ({ page }) => {
  await page.goto("/");
  const mcp = page.locator("#mcp");

  await expect(
    mcp.getByRole("heading", {
      name: "Give your architecture agent cloud judgment.",
    }),
  ).toBeVisible();
  await expect(mcp.getByRole("tab")).toHaveCount(5);
  await expect(
    mcp.getByText("codex mcp add archlex --url https://mcp.archlex.dev/mcp"),
  ).toBeVisible();
  await expect(
    mcp.getByText("4 tools · AWS + GCP · no API key · playground deep links"),
  ).toBeVisible();

  const sectionIds = await page
    .locator("main > section")
    .evaluateAll((sections) => sections.map((section) => section.id));
  expect(sectionIds.indexOf("mcp")).toBeGreaterThan(
    sectionIds.indexOf("capabilities"),
  );
  expect(sectionIds.indexOf("mcp")).toBeLessThan(
    sectionIds.indexOf("source-to-system"),
  );
});

test("keeps every setup readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  const mcp = page.locator("#mcp");
  await expect(mcp.getByText(/codex mcp add archlex/)).toBeVisible();
  await expect(
    mcp.getByText(/claude mcp add --transport http archlex/),
  ).toBeVisible();
  await expect(mcp.getByText('"mcpServers"')).toBeVisible();
  await expect(mcp.getByText('"servers"')).toBeVisible();
  await context.close();
});

test("adapts the MCP console for narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const mcp = page.locator("#mcp");
  const tabs = mcp.locator(".mcp-tabs");

  await expect(tabs).toHaveCSS("overflow-x", "auto");
  await expect(mcp.getByRole("tab", { name: "Generic MCP" })).toBeVisible();
  const documentOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(documentOverflow).toBe(0);
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
