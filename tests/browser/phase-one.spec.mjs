import { expect, test } from "@playwright/test";

const CHAIN_SOURCE = `direction LR
provider aws
validation normal

rds-proxy > rds > ecs`;

const NESTED_SOURCE = `direction LR
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
}`;

const CANVAS_FILL = {
  dark: "#111827",
  light: "#ffffff",
};

async function setTheme(page, theme) {
  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-theme", /dark|light/);

  if ((await shell.getAttribute("data-theme")) !== theme) {
    await page.getByTitle("Toggle Theme").click();
  }

  await expect(shell).toHaveAttribute("data-theme", theme);
  await expect(
    page.locator("svg[data-archlex-version] .archlex-canvas"),
  ).toHaveAttribute("fill", CANVAS_FILL[theme]);
}

async function expectLegacyEffectsAbsent(svg) {
  await expect(
    svg.locator(
      ":scope > defs filter, :scope > defs linearGradient, :scope > defs radialGradient",
    ),
  ).toHaveCount(0);
  await expect(
    svg.locator("animate, animateMotion, animateTransform, set"),
  ).toHaveCount(0);
  await expect(svg.locator('[class*="pill"], [id*="glass"]')).toHaveCount(0);

  const unsafeReferences = await svg.locator("*").evaluateAll((elements) => {
    const findings = [];
    for (const element of elements) {
      for (const attribute of element.attributes) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        if (
          (name === "href" || name === "xlink:href") &&
          !value.startsWith("#")
        ) {
          findings.push(`${name}=${value}`);
        }
        for (const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
          if (!match[2]?.startsWith("#")) findings.push(`${name}=${value}`);
        }
      }
    }
    return findings;
  });
  expect(unsafeReferences).toEqual([]);

  const styleText = (await svg.locator("style").allTextContents()).join("\n");
  expect(styleText).not.toMatch(/\b(?:animation|animation-name)\s*:/i);
}

test("permits inert provider-owned gradients and filters", async ({ page }) => {
  await page.setContent(`
    <svg xmlns="http://www.w3.org/2000/svg" data-archlex-version="0.1.0">
      <defs><marker id="arrowhead"/></defs>
      <g class="archlex-node">
        <svg data-archlex-icon="aws.fixture" viewBox="0 0 4 4">
          <defs>
            <linearGradient id="provider-paint"><stop offset="0" stop-color="#fff"/></linearGradient>
            <filter id="provider-soft"><feGaussianBlur stdDeviation="0.25"/></filter>
          </defs>
          <rect width="4" height="4" fill="url(#provider-paint)" filter="url(#provider-soft)"/>
        </svg>
      </g>
    </svg>
  `);

  const svg = page.locator("svg[data-archlex-version]");
  await expectLegacyEffectsAbsent(svg);
  await expect(
    svg.locator(
      "[data-archlex-icon] linearGradient, [data-archlex-icon] filter",
    ),
  ).toHaveCount(2);
});

async function expectCompactIconLabelGeometry(node) {
  const icon = node.locator("[data-archlex-icon]");
  const label = node.locator(".archlex-node-label");
  const surface = node.locator(".archlex-node-surface");

  await expect(icon).toBeVisible();
  await expect(label).toBeVisible();

  const iconBox = await icon.boundingBox();
  const labelBox = await label.boundingBox();
  const nodeBox = await surface.boundingBox();

  expect(iconBox).not.toBeNull();
  expect(labelBox).not.toBeNull();
  expect(nodeBox).not.toBeNull();
  expect(iconBox.y + iconBox.height).toBeLessThanOrEqual(labelBox.y);
  expect(nodeBox.width).toBeLessThan(160);
}

for (const theme of ["dark", "light"]) {
  test(`renders the canonical ArchLex chain with official icons in ${theme} theme`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "ArchLex", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue(CHAIN_SOURCE);

    await setTheme(page, theme);

    const svg = page.locator("svg[data-archlex-version]");
    await expect(svg).toContainText("Amazon RDS Proxy");
    await expectLegacyEffectsAbsent(svg);

    for (const [id, iconKey] of [
      ["rds-proxy", "aws.rds-proxy"],
      ["rds", "aws.rds"],
      ["ecs", "aws.ecs"],
    ]) {
      const node = svg.locator(`g.archlex-node[data-archlex-id="${id}"]`);
      const iconUse = node.locator(`use[data-archlex-icon="${iconKey}"]`);
      await expect(iconUse).toHaveCount(1);
      if (iconKey !== "aws.rds-proxy") {
        const href = await iconUse.getAttribute("href");
        expect(href).toMatch(/^#archlex-icon-/);
        const artworkBackground = svg.locator(
          `defs symbol${href} rect[width="64"][height="64"]`,
        );
        await expect(artworkBackground).toHaveAttribute("width", "64");
        await expect(artworkBackground).toHaveAttribute("height", "64");
      }
      await expectCompactIconLabelGeometry(node);
    }

    await expect(
      page.getByRole("button", { name: /open diagnostics/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Diagnostics" })).toHaveCount(
      0,
    );
  });
}

test("offers accessible zoom, fit, actual-size, and drag-to-pan controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("svg[data-archlex-version]")).toBeVisible();

  const zoomLevel = page.getByLabel("Zoom level");
  await expect(page.getByRole("button", { name: "Zoom out" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit diagram" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actual size" })).toBeVisible();

  await page.getByRole("button", { name: "Actual size" }).click();
  await expect(zoomLevel).toHaveText("100%");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(zoomLevel).toHaveText("110%");

  const viewport = page.locator(".preview-viewport");
  const stage = page.locator(".preview-stage");
  const viewportBox = await viewport.boundingBox();
  expect(viewportBox).not.toBeNull();
  if (!viewportBox) throw new Error("preview viewport is not visible");

  await page.mouse.move(viewportBox.x + 80, viewportBox.y + 80);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + 130, viewportBox.y + 110);
  await page.mouse.up();
  await expect(stage).toHaveAttribute("data-pan-x", "50");
  await expect(stage).toHaveAttribute("data-pan-y", "30");

  await page.getByRole("button", { name: "Fit diagram" }).click();
  await expect(stage).toHaveAttribute("data-pan-x", "0");
  await expect(stage).toHaveAttribute("data-pan-y", "0");
});

for (const theme of ["dark", "light"]) {
  test(`renders resources nested below plain scope labels in ${theme} theme`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("textbox").fill(NESTED_SOURCE);
    await setTheme(page, theme);

    const svg = page.locator("svg[data-archlex-version]");
    await expect(svg).toBeVisible();
    await expect(svg.locator(".archlex-scope")).toHaveCount(4);
    await expectLegacyEffectsAbsent(svg);

    const subnet = svg.locator(
      'g.archlex-scope[data-archlex-id$="/subnet:private-a"]',
    );
    const scopeLabel = subnet.locator(".archlex-scope-label");
    const proxy = svg.locator('g.archlex-node[data-archlex-id$="/proxy"]');
    const db = svg.locator('g.archlex-node[data-archlex-id$="/db"]');

    await expect(scopeLabel).toBeVisible();
    await expect(
      proxy.locator('[data-archlex-icon="aws.rds-proxy"]'),
    ).toHaveCount(1);
    await expect(db.locator('[data-archlex-icon="aws.rds"]')).toHaveCount(1);
    await expectCompactIconLabelGeometry(proxy);
    await expectCompactIconLabelGeometry(db);

    const scopeLabelBox = await scopeLabel.boundingBox();
    const childBox = await proxy.boundingBox();
    expect(scopeLabelBox).not.toBeNull();
    expect(childBox).not.toBeNull();
    expect(childBox.y).toBeGreaterThan(scopeLabelBox.y + scopeLabelBox.height);
  });
}
