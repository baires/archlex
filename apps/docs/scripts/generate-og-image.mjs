import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, "..");

const favicon = await readFile(join(docsDir, "public/favicon.svg"), "utf8");
// Force the light-theme (dark ink) variant regardless of color scheme
const logo = favicon.replace(
  /<style>[\s\S]*?<\/style>/,
  "<style>path { fill: #171814; }</style>",
);
const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;

const html = `<!doctype html>
<html>
  <body style="margin:0">
    <div style="
      width:1200px;height:630px;box-sizing:border-box;
      background:#f8f8f4;color:#171814;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      display:flex;flex-direction:column;justify-content:space-between;
      padding:72px 80px;">
      <div style="display:flex;align-items:center;gap:28px">
        <img src="${logoDataUrl}" width="120" height="120" />
        <span style="font-size:64px;font-weight:700;letter-spacing:-1.5px">ArchLex</span>
      </div>
      <div>
        <div style="font-size:44px;font-weight:600;line-height:1.25;max-width:900px">
          Semantic cloud architecture diagrams, compiled from text.
        </div>
        <div style="font-size:26px;color:#5a5b52;margin-top:20px">
          AWS &middot; GCP &middot; Kubernetes — documentation
        </div>
      </div>
      <div style="font-size:24px;color:#5a5b52">docs.archlex.dev</div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
const out = join(docsDir, "public/og-image.png");
await page.screenshot({ path: out });
await browser.close();
console.log(`✓ Generated ${out}`);
