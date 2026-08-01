import { expect, test } from "@playwright/test";
import { visualSnapshotsSupported } from "./visual-platform.mjs";

test.skip(
  !visualSnapshotsSupported(process.platform),
  "Visual baselines are tracked and reviewed on Darwin only",
);

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

const EVENT_PIPELINE_SOURCE = `direction LR
provider aws
validation normal

ingress_api: api-gateway
ingest_fn: lambda
events_bus: eventbridge
notification_topic: sns
buffer_queue: sqs
processor_fn: lambda
lake: s3
nosql_store: dynamodb

ingress_api -[invokes]-> ingest_fn
ingest_fn -[publishes]-> notification_topic
notification_topic -[forwards]-> buffer_queue
events_bus -[triggers]-> buffer_queue
buffer_queue -[batch_invokes]-> processor_fn
processor_fn -[persists]-> nosql_store
processor_fn -[archives]-> lake`;

const MULTI_REGION_SOURCE = `direction LR
provider aws
validation normal

account global-core {
  region us-east-1 {
    vpc primary-vpc {
      subnet app-subnet-1 {
        app_primary: ecs
        db_primary: rds
        cache_primary: elasticache
        app_primary > cache_primary
        app_primary > db_primary
      }
    }
  }
  region us-west-2 {
    vpc failover-vpc {
      subnet app-subnet-2 {
        app_secondary: ecs
        db_replica: rds
        app_secondary > db_replica
      }
    }
  }
}

global_dns: route53
global_dns -[primary]-> app_primary
global_dns -[failover]-> app_secondary
db_primary -[replicates]-> db_replica`;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  narrow: { width: 820, height: 900 },
};

const WORKSPACE_VIEWPORTS = {
  desktop: VIEWPORTS.desktop,
  narrow: { width: 720, height: 900 },
};

const STORAGE_KEYS = ["cloudmer_source_v1", "cloudmer_options_v1"];

const WORKSPACE_SOURCE = `direction LR
provider aws
validation normal

edge: api-gateway
compute: lambda
store: dynamodb

edge -[invokes]-> compute
compute -[writes]-> store`;

const WORKSPACE_WARNING_SOURCE = `direction LR
provider aws
validation normal

subnet orphan {
  api: ecs
}`;

const WORKSPACE_ERROR_SOURCE = `direction LR
provider aws
validation strict

subnet orphan {
  api: ecs
}`;

async function resetStoredWorkspace(page, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript((keys) => {
    for (const key of keys) localStorage.removeItem(key);
  }, STORAGE_KEYS);
}

async function waitForReadyWorkspace(page) {
  const svg = page.locator("svg[data-cloudmer-version]");
  const status = page.locator(".workspace-status-bar");
  await expect(svg).toHaveCount(1);
  await expect(status).toContainText("Ready");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "textarea { caret-color: transparent !important; }",
  });
  await status.locator(".ready").evaluate((node) => {
    node.textContent = "Ready · 0 ms";
  });
}

async function prepareWorkspace(
  page,
  { viewport, source, theme = "dark", validation = "normal", expectedNodes },
) {
  await resetStoredWorkspace(page, viewport);
  await page.goto("/");

  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-theme", "dark");
  if (theme === "light") {
    await page.getByRole("button", { name: "Toggle theme" }).click();
  }
  if (validation === "strict") {
    await page.getByLabel("Validation mode").selectOption("strict");
  }

  const status = page.locator(".workspace-status-bar");
  await page.getByRole("textbox").fill(source);
  await expect(status).toContainText("Rendering");
  const svg = page.locator("svg[data-cloudmer-version]");
  await expect(svg.locator(".cloudmer-node")).toHaveCount(expectedNodes);
  await expect(shell).toHaveAttribute("data-theme", theme);
  await waitForReadyWorkspace(page);
}

async function expectWorkspaceScreenshot(page, name) {
  const geometry = await page.evaluate(() => {
    const commandBar = document.querySelector(".command-bar");
    const statusBar = document.querySelector(".workspace-status-bar");
    return {
      commandBarHeight: commandBar?.getBoundingClientRect().height ?? 0,
      statusBarHeight: statusBar?.getBoundingClientRect().height ?? 0,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  expect(geometry.commandBarHeight).toBeLessThanOrEqual(48);
  expect(geometry.statusBarHeight).toBeLessThanOrEqual(28);
  expect(geometry.horizontalOverflow).toBe(0);

  const separator = page.getByRole("separator", {
    name: "Resize editor and preview",
  });
  if ((await separator.count()) > 0) {
    await expect(separator).toHaveAttribute("aria-valuenow", "40");
  }

  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.01,
  });
}

async function renderScenario(page, scenario, theme) {
  await resetStoredWorkspace(page, await page.viewportSize());
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
  await expect(svg.locator(".cloudmer-node")).toHaveCount(
    scenario.expectedNodes,
  );
  if (scenario.expectedScopes) {
    await expect(svg.locator(".cloudmer-scope")).toHaveCount(
      scenario.expectedScopes,
    );
  }
  await expect(page.locator(".workspace-status-bar")).toContainText("Ready");
}

for (const scenario of [
  { name: "chain", source: CHAIN_SOURCE, expectedNodes: 3 },
  {
    name: "nested",
    source: NESTED_SOURCE,
    expectedNodes: 2,
    expectedScopes: 4,
  },
  { name: "event-pipeline", source: EVENT_PIPELINE_SOURCE, expectedNodes: 8 },
  {
    name: "multi-region",
    source: MULTI_REGION_SOURCE,
    expectedNodes: 6,
    expectedScopes: 7,
  },
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

test("workspace dark desktop", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.desktop,
    source: WORKSPACE_SOURCE,
    expectedNodes: 3,
  });
  await expectWorkspaceScreenshot(page, "workspace-dark-desktop");
});

test("workspace light desktop", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.desktop,
    source: WORKSPACE_SOURCE,
    theme: "light",
    expectedNodes: 3,
  });
  await expectWorkspaceScreenshot(page, "workspace-light-desktop");
});

test("workspace dark narrow editor", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.narrow,
    source: WORKSPACE_SOURCE,
    expectedNodes: 3,
  });
  await expect(page.getByRole("tab", { name: "Editor" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expectWorkspaceScreenshot(page, "workspace-dark-narrow-editor");
});

test("workspace dark narrow preview", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.narrow,
    source: WORKSPACE_SOURCE,
    expectedNodes: 3,
  });
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.locator("svg[data-cloudmer-version]")).toBeVisible();
  await expectWorkspaceScreenshot(page, "workspace-dark-narrow-preview");
});

test("workspace dark warning drawer", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.desktop,
    source: WORKSPACE_WARNING_SOURCE,
    expectedNodes: 1,
  });
  await page
    .getByRole("button", { name: /1 warning, open diagnostics/ })
    .click();
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toBeVisible();
  await expectWorkspaceScreenshot(page, "workspace-dark-warning-drawer");
});

test("workspace dark error drawer", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.desktop,
    source: WORKSPACE_ERROR_SOURCE,
    validation: "strict",
    expectedNodes: 1,
  });
  await expect(page.getByRole("dialog", { name: "Diagnostics" })).toBeVisible();
  await expectWorkspaceScreenshot(page, "workspace-dark-error-drawer");
});

test("workspace dark fullscreen", async ({ page }) => {
  await prepareWorkspace(page, {
    viewport: WORKSPACE_VIEWPORTS.desktop,
    source: WORKSPACE_SOURCE,
    expectedNodes: 3,
  });
  await page.evaluate(() => {
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: undefined,
    });
  });
  await page.getByRole("button", { name: "Enter fullscreen preview" }).click();
  await expect(page.getByTestId("workspace")).toHaveAttribute(
    "data-fullscreen-mode",
    "in-app",
  );
  await expectWorkspaceScreenshot(page, "workspace-dark-fullscreen");
});
