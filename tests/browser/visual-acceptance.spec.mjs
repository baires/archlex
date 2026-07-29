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
  await expect(svg.locator(".cloudmer-node")).toHaveCount(
    scenario.expectedNodes,
  );
  if (scenario.expectedScopes) {
    await expect(svg.locator(".cloudmer-scope")).toHaveCount(
      scenario.expectedScopes,
    );
  }
  await expect(page.locator(".status-badge")).toContainText("Ready");
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
