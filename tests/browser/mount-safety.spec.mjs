import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const browserModule = await readFile(
  resolve(process.cwd(), "packages/core/dist/browser.js"),
  "utf8",
);
const browserModuleUrl = `data:text/javascript;base64,${Buffer.from(browserModule).toString("base64")}`;
const rendererModule = await readFile(
  resolve(process.cwd(), "packages/renderer-svg/dist/index.js"),
  "utf8",
);
const rendererModuleUrl = `data:text/javascript;base64,${Buffer.from(rendererModule).toString("base64")}`;

test("mountSvg rejects prefixed entity-obfuscated foreign content before append or execution", async ({
  page,
}) => {
  await page.goto("/");

  const result = await page.evaluate(async (moduleUrl) => {
    const { mountSvg } = await import(moduleUrl);
    const container = document.createElement("div");
    document.body.appendChild(container);
    window.cloudmerExploitExecuted = false;

    const payload = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xht&#x6d;l"><s:foreignObject width="20" height="20"><x:iframe srcdoc="&lt;script>parent.cloudmerExploitExecuted=true&lt;/script>"/></s:foreignObject></svg>`;
    let error = "";
    try {
      mountSvg(container, payload);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    return {
      error,
      executed: window.cloudmerExploitExecuted,
      childCount: container.childElementCount,
    };
  }, browserModuleUrl);

  expect.soft(result.error).toContain("Safety check failed");
  expect.soft(result.executed).toBe(false);
  expect.soft(result.childCount).toBe(0);
});

test("every supported relationship arrow round-trips with an XML-safe internal ID", async ({
  page,
}) => {
  await page.goto("/");

  const results = await page.evaluate(
    async ({ browserUrl, rendererUrl }) => {
      const { mountSvg } = await import(browserUrl);
      const { serializeSvgGraph } = await import(rendererUrl);
      const arrows = [">", "->", "<-", "<->", "--", "-.->", "-[writes]->"];

      return arrows.map((arrow, index) => {
        const originalId = `source${arrow}target`;
        const graph = {
          width: 200,
          height: 100,
          nodes: [],
          edges: [
            {
              id: originalId,
              source: "source",
              target: "target",
              arrow,
              points: [
                { x: 10, y: 10 + index * 2 },
                { x: 190, y: 10 + index * 2 },
              ],
            },
          ],
        };
        const container = document.createElement("div");
        document.body.appendChild(container);

        try {
          const mounted = mountSvg(container, serializeSvgGraph(graph).svg);
          const edge = mounted.querySelector(".cloudmer-edge");
          return {
            arrow,
            error: "",
            originalId: edge?.getAttribute("data-cloudmer-id"),
            svgId: edge?.id,
          };
        } catch (caught) {
          return {
            arrow,
            error: caught instanceof Error ? caught.message : String(caught),
            originalId: null,
            svgId: null,
          };
        } finally {
          container.remove();
        }
      });
    },
    { browserUrl: browserModuleUrl, rendererUrl: rendererModuleUrl },
  );

  for (const result of results) {
    expect.soft(result.error, result.arrow).toBe("");
    expect
      .soft(result.originalId, result.arrow)
      .toBe(`source${result.arrow}target`);
    expect
      .soft(result.svgId, result.arrow)
      .toMatch(/^cloudmer-edge-[a-f0-9]+$/);
  }
});

test("repeated provider icons mount with unique local IDs and resolved references", async ({
  page,
}) => {
  await page.goto("/");

  const result = await page.evaluate(
    async ({ browserUrl, rendererUrl }) => {
      const { mountSvg } = await import(browserUrl);
      const { serializeSvgGraph } = await import(rendererUrl);
      const icon =
        '<svg viewBox="0 0 4 4"><defs><linearGradient id="paint"><stop offset="0" stop-color="#fff"/></linearGradient></defs><path id="shape" fill="url(#paint)" d="M0 0h4v4z"/><use href="#shape"/></svg>';
      const graph = {
        width: 300,
        height: 120,
        nodes: [
          {
            id: "left",
            x: 10,
            y: 10,
            width: 128,
            height: 92,
            label: "Left",
            icon,
          },
          {
            id: "right",
            x: 160,
            y: 10,
            width: 128,
            height: 92,
            label: "Right",
            icon,
          },
        ],
        edges: [],
      };
      const container = document.createElement("div");
      document.body.appendChild(container);

      try {
        const mounted = mountSvg(container, serializeSvgGraph(graph).svg);
        const ids = Array.from(
          mounted.querySelectorAll("[id]"),
          (element) => element.id,
        );
        const providerIds = ids.filter((id) => id.startsWith("cloudmer-icon-"));
        const references = Array.from(
          mounted.querySelectorAll("[fill^='url'], use[href]"),
          (element) =>
            element.getAttribute("fill") ?? element.getAttribute("href"),
        );
        return {
          error: "",
          providerIds,
          references,
        };
      } catch (caught) {
        return {
          error: caught instanceof Error ? caught.message : String(caught),
          providerIds: [],
          references: [],
        };
      } finally {
        container.remove();
      }
    },
    { browserUrl: browserModuleUrl, rendererUrl: rendererModuleUrl },
  );

  expect(result.error).toBe("");
  expect(result.providerIds).toHaveLength(4);
  expect(new Set(result.providerIds).size).toBe(result.providerIds.length);
  for (const reference of result.references) {
    const id = reference?.replace(/^url\(#|^#|\)$/g, "");
    expect(result.providerIds).toContain(id);
  }
});
