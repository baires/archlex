import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import type * as Cloudflare from "@archlex/cloudflare";
import type * as Core from "@archlex/core";
import type * as Browser from "@archlex/core/browser";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import type * as Layout from "../packages/layout-elk/src/index.js";

const root = resolve(import.meta.dirname, "..");

describe("built Cloudflare package boundaries", () => {
  it("resolves public exports in a fresh DOM-free Node process and renders offline without import side effects", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      assert.equal(typeof document, 'undefined');
      assert.equal(typeof window, 'undefined');
      let fetches = 0;
      globalThis.fetch = () => { fetches++; throw new Error('network disabled'); };
      const before = new Set(Reflect.ownKeys(globalThis));
      const provider = await import('@archlex/cloudflare');
      const core = await import('@archlex/core');
      const browser = await import('@archlex/core/browser');
      assert.deepEqual(Reflect.ownKeys(globalThis).filter(key => !before.has(key)), []);
      assert.equal(typeof browser.mountSvg, 'function');
      assert.equal(core.cloudflareProvider, provider.cloudflareProvider);
      assert.equal(provider.CLOUDFLARE_INCLUDED_IDS.length, 92);
      const engine = core.createArchLex({ providers: [provider.cloudflareProvider()] });
      const source = 'provider cloudflare\\n' + provider.CLOUDFLARE_INCLUDED_IDS.map((kind, i) => 'n' + i + ': ' + kind).join('\\n');
      const rendered = await engine.render(source);
      assert.equal(rendered.graph.nodes.length, 92);
      assert.deepEqual(rendered.diagnostics, []);
      assert.ok(rendered.graph.nodes.every(node => node.icon.includes('CC BY 4.0')));
      assert.equal(fetches, 0);
      console.log(JSON.stringify({ nodes: rendered.graph.nodes.length, fetches }));
    `,
      ],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    expect(JSON.parse(output)).toEqual({ nodes: 92, fetches: 0 });
  });

  it("bundles published entry paths for browsers and renders without DOM or Node globals", async () => {
    const entry = resolve(root, "tests/__cloudflare_boundary_virtual__.js");
    const result = await build({
      configFile: false,
      logLevel: "silent",
      resolve: {
        alias: {
          "@archlex/layout-elk": resolve(
            root,
            "packages/layout-elk/dist/index.js",
          ),
        },
      },
      plugins: [
        {
          name: "cloudflare-boundary-entry",
          resolveId(id) {
            return id === entry ? entry : undefined;
          },
          load(id) {
            if (id === entry)
              return `export { createArchLex, cloudflareProvider } from '@archlex/core'; export { mountSvg } from '@archlex/core/browser'; export { CLOUDFLARE_INCLUDED_IDS } from '@archlex/cloudflare'; export { createInlineLayoutEngine } from '@archlex/layout-elk';`;
          },
        },
      ],
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ["iife"], name: "ArchLexBoundary" },
      },
    });
    const bundle = Array.isArray(result) ? result[0] : result;
    if (!("output" in bundle)) throw new Error("Expected one browser bundle");
    const chunk = bundle.output.find((item) => item.type === "chunk");
    if (!chunk || chunk.type !== "chunk")
      throw new Error("Missing browser JavaScript");
    expect(chunk.code).not.toContain("__vite-browser-external");
    let fetches = 0;
    const sandbox: Record<string, unknown> = {
      setTimeout,
      clearTimeout,
      console,
      performance,
      TextEncoder,
      TextDecoder,
      fetch: () => {
        fetches++;
        throw new Error("network disabled");
      },
    };
    const before = new Set(Object.keys(sandbox));
    runInNewContext(chunk.code, sandbox, { timeout: 10000 });
    expect(
      Object.keys(sandbox).filter((key) => !before.has(key) && key !== "goog"),
    ).toEqual(["ArchLexBoundary"]);
    const api = sandbox.ArchLexBoundary as {
      createArchLex: typeof Core.createArchLex;
      cloudflareProvider: typeof Cloudflare.cloudflareProvider;
      mountSvg: typeof Browser.mountSvg;
      createInlineLayoutEngine: typeof Layout.createInlineLayoutEngine;
      CLOUDFLARE_INCLUDED_IDS: readonly string[];
    };
    expect(typeof api.mountSvg).toBe("function");
    const source = `provider cloudflare\n${api.CLOUDFLARE_INCLUDED_IDS.map((kind, i) => `n${i}: ${kind}`).join("\n")}`;
    const rendered = await api
      .createArchLex({
        providers: [api.cloudflareProvider()],
        layoutEngine: api.createInlineLayoutEngine(),
      })
      .render(source);
    expect(rendered.graph.nodes).toHaveLength(92);
    expect(rendered.diagnostics).toEqual([]);
    expect(
      rendered.graph.nodes.every((node) => node.icon?.includes("CC BY 4.0")),
    ).toBe(true);
    expect(fetches).toBe(0);
    expect(sandbox.document).toBeUndefined();
    expect(sandbox.process).toBeUndefined();
  }, 30000);

  it("ships declarations and entry resolution matching the package export map", () => {
    for (const name of ["cloudflare", "core"]) {
      const directory = resolve(root, "packages", name);
      const pkg = JSON.parse(
        readFileSync(resolve(directory, "package.json"), "utf8"),
      ) as { exports: Record<string, { import: string; types: string }> };
      for (const [subpath, target] of Object.entries(pkg.exports)) {
        expect(
          readFileSync(resolve(directory, target.import), "utf8"),
        ).toBeTruthy();
        const declarations = readFileSync(
          resolve(directory, target.types),
          "utf8",
        );
        expect(declarations).toBeTruthy();
        if (subpath === ".")
          expect(declarations).toContain("cloudflareProvider");
        else if (subpath === "./browser")
          expect(declarations).toContain("mountSvg");
      }
    }
  });
});
