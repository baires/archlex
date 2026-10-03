import { readFileSync } from "node:fs";
import { cloudflareProvider } from "@archlex/cloudflare";
import { describe, expect, it } from "vitest";
import { DOC_RESOURCES } from "../src/generated/docs-resources.js";
import worker from "../src/index.js";
import { SYSTEM_PROMPTS } from "../src/prompts.js";
import { ARCHLEX_SYNTAX_GUIDE } from "../src/resources.js";
import { handleGetCatalog } from "../src/tools/catalog.js";
import { handleRenderDiagram } from "../src/tools/render.js";
import { handleValidateDiagram } from "../src/tools/validate.js";

describe("Cloudflare MCP catalog discovery", () => {
  it("exposes Workers once with its canonical id and alias", async () => {
    const library = cloudflareProvider().listServices?.() ?? [];
    const result = await handleGetCatalog({ provider: "cloudflare" });
    const payload = JSON.parse(result.content[0].text);
    const services = payload.providers.cloudflare.services;

    expect(payload.providers.cloudflare.name).toBe("Cloudflare");
    expect(services).toEqual(
      library.map((service) =>
        expect.objectContaining({
          id: service.id,
          displayName: service.displayName,
          aliases: service.aliases,
        }),
      ),
    );
    expect(
      services.filter((service: { id: string }) => service.id === "workers"),
    ).toEqual([
      expect.objectContaining({
        id: "workers",
        displayName: "Workers",
        aliases: ["cloudflare.workers"],
      }),
    ]);
  });

  it("keeps pagination schema for Cloudflare and mixed queries", async () => {
    const cloudflare = await handleGetCatalog({
      provider: "cloudflare",
      query: "workers",
      limit: 20,
    });
    const mixed = await handleGetCatalog({ query: "workers", limit: 5 });
    const cloudflarePayload = JSON.parse(cloudflare.content[0].text);
    const mixedPayload = JSON.parse(mixed.content[0].text);

    expect(cloudflarePayload).toEqual(
      expect.objectContaining({
        provider: "cloudflare",
        query: "workers",
        count: expect.any(Number),
      }),
    );
    expect(cloudflarePayload.count).toBeGreaterThan(1);
    expect(cloudflarePayload.count).toBe(cloudflarePayload.matches.length);
    expect(cloudflarePayload.count).toBeLessThanOrEqual(20);
    expect(cloudflarePayload.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "cloudflare",
          id: "workers",
          aliases: ["cloudflare.workers"],
        }),
      ]),
    );
    expect(mixedPayload.provider).toBe("all");
    expect(mixedPayload.count).toBeLessThanOrEqual(5);
    expect(mixedPayload.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "cloudflare", id: "workers" }),
      ]),
    );
    expect(ARCHLEX_SYNTAX_GUIDE).toContain("provider cloudflare");
    expect(ARCHLEX_SYNTAX_GUIDE).toContain("cloudflare.workers");
  });
});

describe("Cloudflare MCP authoring documentation", () => {
  it("advertises Cloudflare and its scope limits in the authoring prompt", () => {
    const prompt = SYSTEM_PROMPTS.architect_cloud_infrastructure;
    expect(prompt.arguments[0].description).toContain("cloudflare");
    const text = prompt.generateMessages({
      provider: "cloudflare",
      requirements: "Workers and R2",
    })[0].content.text;
    expect(text).toContain("account");
    expect(text).toContain("root");
    expect(text).toContain("Cloudflare");
  });

  it("embeds the MCP workflow and public Cloudflare semantics guide", () => {
    const mcp = DOC_RESOURCES["archlex://docs/guides/mcp-server"];
    const cloudflare = DOC_RESOURCES["archlex://docs/guides/cloudflare-pack"];
    expect(mcp.text).toContain('"provider": "cloudflare"');
    expect(mcp.text).toContain("archlex://docs/guides/cloudflare-pack");
    expect(cloudflare.text).toContain("CLOUDFLARE-CONTAINMENT-001");
    expect(cloudflare.text).toContain("Outbound tunnel establishment");
  });
});

it("reports Cloudflare in health discovery", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/health"),
  );
  expect(await response.json()).toMatchObject({
    providers: ["aws", "cloudflare", "gcp", "k8s"],
  });
});
it("executes the guide JSON examples and embeds exact public sources", async () => {
  const guide = readFileSync(
    new URL("../../../docs/guides/mcp-server.md", import.meta.url),
    "utf8",
  );
  for (const name of ["mcp-server", "cloudflare-pack"]) {
    expect(DOC_RESOURCES[`archlex://docs/guides/${name}`].text).toBe(
      readFileSync(
        new URL(`../../../docs/guides/${name}.md`, import.meta.url),
        "utf8",
      ),
    );
  }
  const blocks = [...guide.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) =>
    JSON.parse(match[1]),
  );
  const lookup = blocks.find((block) => block.provider === "cloudflare");
  const catalog = JSON.parse((await handleGetCatalog(lookup)).content[0].text);
  expect(catalog.matches).toContainEqual(
    expect.objectContaining({ id: "workers" }),
  );
  const render = blocks.find((block) =>
    block.source?.startsWith("provider cloudflare"),
  );
  expect(render.source).toBe(
    readFileSync(
      new URL(
        "../../../tests/fixtures/cloudflare/standalone.archlex",
        import.meta.url,
      ),
      "utf8",
    ).trim(),
  );
  const rendered = await handleRenderDiagram(render, {
    iconLoader: {
      async loadIcons() {
        return { icons: new Map(), diagnostics: [] };
      },
    },
  });
  expect(rendered.structuredContent?.success).toBe(true);
  for (const validation of ["normal", "strict", "off"] as const) {
    for (const args of [
      { source: render.source, validation },
      { source: "workers > r2", provider: "cloudflare" as const, validation },
    ]) {
      const result = JSON.parse(
        (await handleValidateDiagram(args)).content[0].text,
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toEqual([]);
    }
  }
});
