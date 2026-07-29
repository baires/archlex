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

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  narrow: { width: 820, height: 900 },
};

async function renderScenario(page, scenario, theme) {
  await page.goto("/");
  await page.getByRole("textbox").fill(scenario.source);

  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-theme", /dark|light/);
  if ((await shell.getAttribute("data-theme")) !== theme) {
    await page.getByTitle("Toggle Theme").click();
  }

  await expect(shell).toHaveAttribute("data-theme", theme);
  const svg = page.locator("svg[data-cloudmer-version]");
  await expect(svg).toBeVisible();
  if (scenario.name === "nested") {
    await expect(svg.locator(".cloudmer-scope")).toHaveCount(4);
  } else {
    await expect(svg.locator(".cloudmer-node")).toHaveCount(3);
  }
  await expect(page.locator(".status-badge")).toContainText("Ready");
}

for (const scenario of [
  { name: "chain", source: CHAIN_SOURCE },
  { name: "nested", source: NESTED_SOURCE },
]) {
  for (const theme of ["dark", "light"]) {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      test(`${scenario.name} diagram in ${theme} theme at ${viewportName} width`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await renderScenario(page, scenario, theme);

        await expect(page.getByTestId("preview")).toHaveScreenshot(
          `${scenario.name}-${theme}-${viewportName}.png`,
          {
            animations: "disabled",
            maxDiffPixelRatio: 0.01,
          },
        );
      });
    }
  }
}
