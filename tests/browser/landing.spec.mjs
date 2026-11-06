import { expect, test } from "@playwright/test";

test("leads with LLM readiness, free MCP and a real multicloud diagram", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cloud diagrams. Built for agents.",
  );
  await expect(
    page.getByRole("link", { name: "Connect free MCP", exact: true }),
  ).toHaveAttribute("href", "#get-started");
  await expect(page.locator("[data-review-status]")).toHaveText(
    "✓ Checks passed",
  );
  await expect(
    page.locator(
      ".review-variant:not([hidden]) .review-svg--light.review-svg--LR svg",
    ),
  ).toBeVisible();
  await expect(page.locator(".review-hero")).toContainText(
    "Built for LLMs and MCP",
  );
  await expect(page.locator(".review-hero")).toContainText("No API keys");
  await expect(
    page.locator(".multicloud-svg--light.multicloud-svg--LR .archlex-node"),
  ).toHaveCount(4);
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
});

test("keeps diagram, diagnostic, source and playground URL in sync through correction", async ({
  page,
}) => {
  await page.goto("/");
  const bench = page.locator("[data-review-bench]");
  await bench.getByRole("button", { name: "Introduce a mistake" }).click();
  await expect(bench.locator("[data-review-status]")).toHaveText(
    "△ 1 semantic warning",
  );
  await expect(bench.locator("[data-source-relationship]")).toHaveText(
    "invokes",
  );
  await expect(bench.locator('[data-review-variant="warning"]')).toBeVisible();
  await bench.getByText("View provider diagnostic").click();
  await expect(
    bench.getByText("AWS-RELATIONSHIP-INVALID-ENDPOINT-001", { exact: true }),
  ).toBeVisible();
  const warningUrl = await bench
    .locator("[data-review-playground]")
    .getAttribute("href");
  expect(new URL(warningUrl).searchParams.get("code")).toContain(
    "worker -[invokes]-> data",
  );
  await bench.getByRole("button", { name: "Correct to writes" }).click();
  await expect(bench.locator("[data-review-status]")).toHaveText(
    "✓ Checks passed",
  );
  await expect(bench.locator("[data-source-relationship]")).toHaveText(
    "writes",
  );
  await expect(bench.locator("[data-review-diagnostic]")).toBeHidden();
  const correctedUrl = await bench
    .locator("[data-review-playground]")
    .getAttribute("href");
  expect(new URL(correctedUrl).searchParams.get("code")).toContain(
    "worker -[writes]-> data",
  );
});

test("inspects endpoints and matching source using the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const choice = page.getByRole("button", {
    name: "API → handler",
    exact: true,
  });
  await choice.focus();
  await page.keyboard.press("Enter");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-review-title]")).toHaveText(
    "An API invokes a function.",
  );
  await expect(page.locator('[data-source-connection="invoke"]')).toHaveClass(
    /is-selected/,
  );
  const selected = await page
    .locator(
      ".review-variant:not([hidden]) .review-svg--light.review-svg--LR .archlex-node.is-inspected",
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-archlex-id")).sort(),
    );
  expect(selected).toEqual(["api", "worker"]);
});

for (const width of [320, 390, 768, 1440]) {
  test(`composes the review without horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await expect(page.getByLabel("Theme", { exact: true })).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: /playground/i }),
    ).toBeVisible();
    const direction = width <= 760 ? "TB" : "LR";
    await expect(
      page.locator(
        `.review-variant:not([hidden]) .review-svg--light.review-svg--${direction} svg`,
      ),
    ).toBeVisible();
  });
}

test("switches setup paths with arrow, Home and End keys", async ({ page }) => {
  await page.goto("/");
  const mcp = page.getByRole("tab", { name: "Free MCP" });
  const agent = page.getByRole("tab", { name: "Agent skill" });
  const browser = page.getByRole("tab", { name: "Playground" });
  const app = page.getByRole("tab", { name: "SDK" });
  await expect(mcp).toHaveAttribute("aria-selected", "true");
  await mcp.focus();
  await page.keyboard.press("ArrowRight");
  await expect(agent).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(browser).toBeFocused();
  await expect(browser).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { name: "Playground" }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(app).toBeFocused();
  await page.keyboard.press("Home");
  await expect(mcp).toBeFocused();
});

test("copies setup text and announces success", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Copy MCP URL" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "https://mcp.archlex.dev/mcp",
  );
  await expect(page.locator("[data-setup] [data-copy-status]")).toHaveText(
    "Copied to clipboard.",
  );
});

test("selects the command and explains clipboard failure", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Copy MCP URL" }).click();
  await expect(page.locator("[data-setup] [data-copy-status]")).toHaveText(
    /Select and copy/,
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "https://mcp.archlex.dev/mcp",
  );
});

test("has a usable static example without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-review-status]")).toHaveText(
    "✓ Checks passed",
  );
  await expect(
    page.locator(
      ".review-variant:not([hidden]) .review-svg--light.review-svg--LR svg",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Introduce a mistake" }),
  ).toBeDisabled();
  await expect(
    page.getByText("https://mcp.archlex.dev/mcp", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-review-playground]")).toHaveAttribute(
    "href",
    /\?code=/,
  );
  await context.close();
});

test("supports skip navigation, reduced motion and correction", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.getByRole("button", { name: "Introduce a mistake" }).click();
  await expect(page.locator("[data-review-title]")).toBeVisible();
  await expect(page.locator("[data-review-title]")).toHaveText(
    "DynamoDB cannot be an “invokes” target.",
  );
  await context.close();
});

test("uses the configured GitHub destination", async ({ page }) => {
  await page.goto("/");
  const github = page.locator("header").getByRole("link", { name: /GitHub/ });
  await expect(github).toHaveAttribute(
    "href",
    "https://github.com/example/archlex",
  );
  await expect(github).toHaveAttribute("target", "_blank");
  await expect(github).toHaveAttribute("rel", /noopener noreferrer/);
});

test("follows system theme and persists a visitor override", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("system");
  await expect(
    page.locator(
      ".review-variant:not([hidden]) .review-svg--dark.review-svg--LR svg",
    ),
  ).toBeVisible();
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("light");
  await page.getByLabel("Theme", { exact: true }).selectOption("system");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
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
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("keeps the AWS article and real 404 navigable", async ({ page }) => {
  await page.goto("/aws-architecture-diagrams/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "AWS architecture diagrams as code.",
  );
  const response = await page.goto("/missing-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This connection leads nowhere.",
  );
  await expect(
    page.getByRole("link", { name: "Back to the example" }),
  ).toHaveAttribute("href", "/");
});

test("copies a multicloud agent prompt with feedback scoped to the hero", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  for (const provider of ["Cloudflare", "AWS", "GCP", "Kubernetes"])
    expect(prompt).toContain(provider);
  await expect(page.locator(".multicloud-stage [data-copy-status]")).toHaveText(
    "Copied to clipboard.",
  );
  await expect(page.locator("[data-setup] [data-copy-status]")).toHaveText("");
});

test("keeps the optional skill command one tab away", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("tab", { name: "Agent skill", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy install command", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "npx skills add baires/archlex",
  );
});

for (const width of [390, 1440]) {
  test(`keeps setup geometry stable when changing tabs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const heights = [];
    for (const tab of ["Free MCP", "Agent skill", "Playground", "SDK"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      heights.push(
        await page
          .locator("[data-setup]")
          .evaluate((element) => element.getBoundingClientRect().height),
      );
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  });
}

test("copies a client-aware MCP setup prompt", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Copy setup prompt", exact: true })
    .click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  for (const expected of [
    "Claude Code",
    "Cursor",
    "Codex",
    "VS Code/Copilot",
    "Streamable HTTP",
    "https://mcp.archlex.dev/mcp",
    "preserve all other MCP servers",
    "render_diagram",
    "validate_diagram",
    "get_cloud_catalog",
    "generate_playground_url",
  ])
    expect(prompt).toContain(expected);
  await expect(page.locator("[data-setup] [data-copy-status]")).toHaveText(
    "Copied to clipboard.",
  );
});

test("opens and selects the setup prompt when clipboard access is blocked", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Copy setup prompt", exact: true })
    .click();
  await expect(page.locator(".setup__agent-prompt details")).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.locator(".setup__agent-prompt [data-copy-text]"),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.getSelection()?.toString()),
  ).toContain("Set up the ArchLex MCP server");
});
