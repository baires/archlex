import {
  awsProvider,
  cloudflareProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import type { IconLoader } from "@archlex/icons-core";
import { describe, expect, it, vi } from "vitest";
import { handleRenderDiagram } from "../src/tools/render.js";
import { handleValidateDiagram } from "../src/tools/validate.js";

const offlineIcons: IconLoader = {
  async loadIcons() {
    return { icons: new Map(), diagnostics: [] };
  },
};

const core = createArchLex({
  providers: [
    awsProvider(),
    gcpProvider(),
    k8sProvider(),
    cloudflareProvider(),
  ],
  defaultProvider: "aws",
});

const sources = [
  'provider cloudflare\nworkers["API"]',
  "provider aws\ncloudflare.workers > rds",
];

describe("Cloudflare MCP render and validate", () => {
  it.each(sources)("agrees with core for %s", async (source) => {
    const coreResult = await core.render(source, { validation: "normal" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const rendered = await handleRenderDiagram(
      {
        source,
        format: "svg",
        validation: "normal",
      },
      { iconLoader: offlineIcons },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    const validated = await handleValidateDiagram({
      source,
      validation: "normal",
    });
    const validation = JSON.parse(validated.content[0].text);

    expect(rendered.structuredContent).toEqual(
      expect.objectContaining({
        success: true,
        svg: coreResult.svg,
        nodes_count: coreResult.graph.nodes.length,
        edges_count: coreResult.graph.edges.length,
        diagnostics: expect.any(Array),
      }),
    );
    expect(rendered.structuredContent?.diagnostics).toEqual(
      coreResult.diagnostics.map((diagnostic) =>
        expect.objectContaining({
          code: diagnostic.code,
          severity: diagnostic.severity,
          message: diagnostic.message,
        }),
      ),
    );
    expect(
      rendered.content
        .map((item) => (item.type === "text" ? item.text : ""))
        .join("\n"),
    ).toContain(coreResult.svg);
    expect(validation.diagnostics).toEqual(
      coreResult.diagnostics.map((diagnostic) =>
        expect.objectContaining({
          code: diagnostic.code,
          severity: diagnostic.severity,
          message: diagnostic.message,
        }),
      ),
    );
    expect(validation.nodes_count).toBe(coreResult.graph.nodes.length);
    expect(validation.valid).toBe(true);
  });
});
