import { cloudflareProvider } from "@archlex/cloudflare";
import { describe, expect, it } from "vitest";
import { ARCHLEX_SYNTAX_GUIDE } from "../src/resources.js";
import { handleGetCatalog } from "../src/tools/catalog.js";

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
        count: 1,
      }),
    );
    expect(cloudflarePayload.matches).toEqual([
      expect.objectContaining({
        provider: "cloudflare",
        id: "workers",
        aliases: ["cloudflare.workers"],
      }),
    ]);
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
