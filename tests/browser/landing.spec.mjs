import { expect, test } from "@playwright/test";

test("leads with agent skill install, then MCP", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Diagrams that know what they mean.",
  );
  await expect(
    page.getByText("Open source · Claude, Cursor, Codex"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Install agent skill" }),
  ).toHaveAttribute("href", "#skill");
  await expect(page.getByRole("link", { name: "Connect MCP" })).toHaveAttribute(
    "href",
    "#mcp",
  );
  await expect(page.locator(".hero-compare img").first()).toHaveAttribute(
    "src",
    /\.svg$/,
  );
});

test("orders the product story as semantics, MCP, skill, then packages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Semantic Validation and Code Review",
    "Built for AI agents.",
    "Official agent skill.",
    "Open source. Embed anywhere.",
    "See your architecture clearly.",
  ]);
  await expect(page.getByText("npx skills add baires/archlex")).toBeVisible();
  await expect(
    page.getByText(
      "npm install @archlex/core @archlex/aws @archlex/gcp @archlex/k8s",
    ),
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
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await expect(
      page.getByRole("link", { name: /playground/i }).first(),
    ).toBeVisible();
    await expect(page.getByLabel("Theme")).toBeVisible();
  });
}

test("keeps secondary navigation discoverable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.locator("header").getByRole("link", { name: "Docs" }),
  ).toBeHidden();
  await expect(
    page.locator("footer").getByRole("link", { name: "Docs" }),
  ).toBeVisible();
  await expect(
    page.locator("header").getByRole("link", { name: /playground/i }),
  ).toBeVisible();
});

test("supports skip navigation and reduced motion", async ({ browser }) => {
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
  const claude = mcp.getByRole("tab", { name: "Claude Code" });
  const cursor = mcp.getByRole("tab", { name: "Cursor" });

  await expect(claude).toHaveAttribute("aria-selected", "true");
  await claude.focus();
  await page.keyboard.press("ArrowRight");
  await expect(cursor).toBeFocused();
  await expect(cursor).toHaveAttribute("aria-selected", "true");
  await expect(mcp.getByRole("tabpanel", { name: "Cursor" })).toBeVisible();
  await expect(mcp.getByRole("tabpanel", { name: "Claude Code" })).toBeHidden();
});

test("copies setup text and announces success", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const mcp = page.locator("#mcp");
  await mcp.getByRole("button", { name: /copy claude code setup/i }).click();

  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "claude mcp add --transport http archlex https://mcp.archlex.dev/mcp",
  );
  await expect(mcp.getByRole("status")).toHaveText(/claude code setup copied/i);
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
  await mcp.getByRole("button", { name: /copy claude code setup/i }).click();

  await expect(mcp.getByRole("status")).toHaveText(/selected.*copy manually/i);
  expect(
    await page.evaluate(() => window.getSelection()?.toString()),
  ).toContain("claude mcp add --transport http archlex");
});

test("presents MCP as the agent conversion path", async ({ page }) => {
  await page.goto("/");
  const mcp = page.locator("#mcp");
  await expect(
    mcp.getByRole("heading", { name: "Built for AI agents." }),
  ).toBeVisible();
  await expect(mcp.getByRole("tab")).toHaveCount(5);
  await expect(
    mcp.getByText(
      "claude mcp add --transport http archlex https://mcp.archlex.dev/mcp",
    ),
  ).toBeVisible();
  await expect(mcp.getByText("No API key required")).toBeVisible();
  await expect(
    mcp.getByText(/Design a resilient AWS event ingestion system/),
  ).toBeVisible();
  await expect(
    mcp.getByRole("link", { name: /full MCP documentation/i }),
  ).toHaveAttribute("href", /guides\/mcp-server/);
});

test("keeps every setup readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  const mcp = page.locator("#mcp");
  await expect(
    mcp.getByText(/claude mcp add --transport http archlex/),
  ).toBeVisible();
  await expect(mcp.getByText(/codex mcp add archlex/)).toBeVisible();
  await expect(mcp.getByText('"mcpServers"')).toBeVisible();
  await expect(mcp.getByText('"servers"')).toBeVisible();
  await expect(page.getByText("npx skills add baires/archlex")).toBeVisible();
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
  const githubLink = page.getByRole("link", { name: "GitHub" }).first();
  await expect(githubLink).toHaveAttribute(
    "href",
    "https://github.com/example/archlex",
  );
  await expect(githubLink).toHaveAttribute("target", "_blank");
  await expect(githubLink).toHaveAttribute("rel", /noopener noreferrer/);
});

test("follows the system theme until the visitor chooses an override", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(page.getByLabel("Theme")).toHaveValue("system");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#11120f",
  );

  await page.getByLabel("Theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("archlex-theme"))).toBe(
    "light",
  );

  await page.reload();
  await expect(page.getByLabel("Theme")).toHaveValue("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByLabel("Theme").selectOption("system");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(
    await page.evaluate(() => localStorage.getItem("archlex-theme")),
  ).toBeNull();
  await context.close();
});

test("survives unavailable theme storage", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("storage denied");
    };
    Storage.prototype.setItem = () => {
      throw new Error("storage denied");
    };
  });
  await page.goto("/");
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
