import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { awsProvider, createArchLex } from "@archlex/core";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/diagrams");

const diagrams = {
  "serverless-api": `direction LR
provider aws

api-gateway -[invokes]-> lambda -[writes]-> dynamodb
`,
  "multi-region": `direction LR
provider aws

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
global_dns -[routes]->|primary| app_primary
global_dns -[routes]->|failover| app_secondary
db_primary -[replicates]-> db_replica
`,
} as const;

function sizedSvg(svg: string): { svg: string; width: number; height: number } {
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!viewBox) {
    throw new Error("SVG is missing a viewBox");
  }
  const width = Number.parseFloat(viewBox[1]);
  const height = Number.parseFloat(viewBox[2]);
  const withSize = svg.includes(" width=")
    ? svg
    : svg.replace("<svg ", `<svg width="${width}" height="${height}" `);
  return { svg: withSize, width, height };
}

async function svgToPng(
  svg: string,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const scale = 2;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: {
        width: Math.ceil(width),
        height: Math.ceil(height),
      },
      deviceScaleFactor: scale,
    });
    await page.setContent(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        * { margin: 0; padding: 0; }
        body { width: ${width}px; height: ${height}px; background: #ffffff; }
        svg { display: block; }
      </style></head><body>${svg}</body></html>`,
      { waitUntil: "load" },
    );
    await page.screenshot({
      path: outputPath,
      type: "png",
      omitBackground: false,
    });
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const archlex = createArchLex({ providers: [awsProvider()] });

  for (const [name, source] of Object.entries(diagrams)) {
    const result = await archlex.render(source, { theme: "light" });
    const errors = result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    if (errors.length > 0) {
      throw new Error(
        `${name} rendered with errors: ${errors.map((item) => item.message).join("; ")}`,
      );
    }
    const { svg, width, height } = sizedSvg(result.svg);
    await writeFile(join(outDir, `${name}.svg`), svg);
    await svgToPng(svg, width, height, join(outDir, `${name}.png`));
  }
}

await main();
