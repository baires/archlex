import { readFile } from "node:fs/promises";
import { cloudflareProvider } from "@archlex/cloudflare";
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { expect, test } from "@playwright/test";
import { replaceEditorSource } from "./visual-platform.mjs";

const engine = createArchLex({
  providers: [
    cloudflareProvider(),
    awsProvider(),
    gcpProvider(),
    k8sProvider(),
  ],
});
for (const fixture of [
  "standalone",
  "aws-public-edge",
  "gcp-k8s-tunnel",
  "aws-gcp-failover",
]) {
  for (const theme of ["light", "dark"]) {
    test(`${fixture} ${theme}: offline artwork, accessibility and SVG export`, async ({
      page,
    }) => {
      const source = await readFile(
        new URL(`../fixtures/cloudflare/${fixture}.archlex`, import.meta.url),
        "utf8",
      );
      const prepared = await engine.prepare(source);
      await page.goto("/");
      await expect(page.locator(".monaco-editor .view-lines")).toBeVisible();
      const foreignRequests = [];
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (
          ["http:", "https:"].includes(url.protocol) &&
          !["127.0.0.1", "localhost"].includes(url.hostname)
        ) {
          foreignRequests.push(url.href);
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.getByRole("button", { name: "Toggle theme" }).click();
      await replaceEditorSource(page, source);
      const preview = page.getByRole("tab", { name: "Preview", exact: true });
      if (await preview.isVisible()) await preview.click();
      const svg = page.locator("svg[data-archlex-version]");
      await expect(svg).toBeVisible();
      for (const node of prepared.graph.nodes)
        await expect(
          svg.locator(`[data-archlex-id="${node.id}"]`),
        ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /errors?, open diagnostics/ }),
      ).toHaveCount(0);
      const cloudflareNodes = prepared.graph.nodes
        .filter((node) => node.provider === "cloudflare")
        .map((node) => ({ id: node.id, icon: node.icon }));
      const checkSvg = async (svgText) =>
        page.evaluate(
          ({ svgText, nodes }) => {
            const document = new DOMParser().parseFromString(
              svgText,
              "image/svg+xml",
            );
            const ids = [...document.querySelectorAll("[id]")].map(
              (element) => element.id,
            );
            return {
              parseErrors: document.querySelectorAll("parsererror").length,
              duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
              icons: nodes.map((node) => {
                const group = document.querySelector(
                  `[data-archlex-id="${node.id}"]`,
                );
                const reference = group
                  ?.querySelector("use")
                  ?.getAttribute("href");
                const artwork = reference
                  ? document.getElementById(reference.slice(1))
                  : group;
                const original = new DOMParser().parseFromString(
                  node.icon,
                  "image/svg+xml",
                );
                const paths = [...original.querySelectorAll("path")].map(
                  (path) => path.getAttribute("d"),
                );
                return {
                  accessible: Boolean(group?.getAttribute("aria-label")),
                  pathsPreserved:
                    paths.length > 0 &&
                    paths.every((d) =>
                      [...artwork.querySelectorAll("path")].some(
                        (path) => path.getAttribute("d") === d,
                      ),
                    ),
                  whiteBacking: Boolean(
                    artwork?.querySelector('[fill="#fff"]'),
                  ),
                };
              }),
              externalImages: [...document.querySelectorAll("image")].filter(
                (element) =>
                  /^https?:/.test(element.getAttribute("href") ?? ""),
              ).length,
            };
          },
          { svgText, nodes: cloudflareNodes },
        );
      const expected = {
        parseErrors: 0,
        duplicateIds: [],
        externalImages: 0,
        icons: cloudflareNodes.map(() => ({
          accessible: true,
          pathsPreserved: true,
          whiteBacking: true,
        })),
      };
      expect(
        await checkSvg(await svg.evaluate((element) => element.outerHTML)),
      ).toEqual(expected);
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /^Export/ }).click();
      await page
        .getByRole("menuitem", { name: "Download SVG", exact: true })
        .click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe("archlex-diagram.svg");
      const downloaded = await readFile(await download.path(), "utf8");
      expect(await checkSvg(downloaded)).toEqual(expected);
      expect(foreignRequests.filter((url) => /cloudflare/i.test(url))).toEqual(
        [],
      );
      await page.setViewportSize({ width: 3840, height: 1600 });
      await page
        .getByRole("button", { name: "Actual size", exact: true })
        .click();
      await page.screenshot({
        path: test.info().outputPath(`${fixture}-${theme}.png`),
      });
    });
  }
}
