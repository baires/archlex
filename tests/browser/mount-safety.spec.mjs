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
    window.archlexExploitExecuted = false;

    const payload = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xht&#x6d;l"><s:foreignObject width="20" height="20"><x:iframe srcdoc="&lt;script>parent.archlexExploitExecuted=true&lt;/script>"/></s:foreignObject></svg>`;
    let error = "";
    try {
      mountSvg(container, payload);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    return {
      error,
      executed: window.archlexExploitExecuted,
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
          const edge = mounted.querySelector(".archlex-edge");
          return {
            arrow,
            error: "",
            originalId: edge?.getAttribute("data-archlex-id"),
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
    expect.soft(result.svgId, result.arrow).toMatch(/^archlex-edge-[a-f0-9]+$/);
  }
});

test("shared provider icons mount with unique local IDs and resolved references", async ({
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
        const providerIds = ids.filter((id) => id.startsWith("archlex-icon-"));
        const references = Array.from(
          mounted.querySelectorAll("[fill^='url'], use[href]"),
          (element) =>
            element.getAttribute("fill") ?? element.getAttribute("href"),
        );
        return {
          error: "",
          providerIds,
          references,
          symbolCount: mounted.querySelectorAll("symbol").length,
        };
      } catch (caught) {
        return {
          error: caught instanceof Error ? caught.message : String(caught),
          providerIds: [],
          references: [],
          symbolCount: 0,
        };
      } finally {
        container.remove();
      }
    },
    { browserUrl: browserModuleUrl, rendererUrl: rendererModuleUrl },
  );

  expect(result.error).toBe("");
  // Identical artwork is deduplicated into one shared symbol: the symbol id
  // plus its two namespaced internal ids (paint, shape).
  expect(result.symbolCount).toBe(1);
  expect(result.providerIds).toHaveLength(3);
  expect(new Set(result.providerIds).size).toBe(result.providerIds.length);
  for (const reference of result.references) {
    const id = reference?.replace(/^url\(#|^#|\)$/g, "");
    expect(result.providerIds).toContain(id);
  }
});

test("keeps a two-line label below the icon and inside a 128 by 92 card", async ({
  page,
}) => {
  await page.goto("/");

  const geometry = await page.evaluate(
    async ({ browserUrl, rendererUrl }) => {
      const { mountSvg } = await import(browserUrl);
      const { serializeSvgGraph } = await import(rendererUrl);
      const graph = {
        width: 148,
        height: 112,
        nodes: [
          {
            id: "compact",
            x: 10,
            y: 10,
            width: 128,
            height: 92,
            label: "Amazon RDS Primary",
            icon: '<svg viewBox="0 0 4 4"><rect width="4" height="4" fill="#c925d1"/></svg>',
            iconKey: "aws.fixture",
          },
        ],
        edges: [],
      };
      const container = document.createElement("div");
      document.body.appendChild(container);

      try {
        const mounted = mountSvg(container, serializeSvgGraph(graph).svg);
        const icon = mounted.querySelector("[data-archlex-icon]");
        const label = mounted.querySelector(".archlex-node-label");
        const surface = mounted.querySelector(".archlex-node-surface");
        if (!(icon instanceof SVGGraphicsElement))
          throw new Error("missing icon");
        if (!(label instanceof SVGGraphicsElement))
          throw new Error("missing label");
        if (!(surface instanceof SVGGraphicsElement)) {
          throw new Error("missing surface");
        }

        const iconBox = icon.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        const surfaceBox = surface.getBoundingClientRect();
        return {
          iconBottom: iconBox.bottom,
          labelTop: labelBox.top,
          labelBottom: labelBox.bottom,
          surfaceBottom: surfaceBox.bottom,
          surfaceWidth: surface.getBBox().width,
          surfaceHeight: surface.getBBox().height,
          lineCount: label.querySelectorAll("tspan").length,
        };
      } finally {
        container.remove();
      }
    },
    { browserUrl: browserModuleUrl, rendererUrl: rendererModuleUrl },
  );

  expect(geometry.surfaceWidth).toBe(128);
  expect(geometry.surfaceHeight).toBe(92);
  expect(geometry.lineCount).toBe(2);
  expect(geometry.iconBottom).toBeLessThanOrEqual(geometry.labelTop);
  expect(geometry.labelBottom).toBeLessThanOrEqual(geometry.surfaceBottom);
});
