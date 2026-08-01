import type { CdnProviderDefinition } from "@archlex/icons-core";
import { beforeAll, describe, expect, it, vi } from "vitest";

const registerProvider = vi.hoisted(() => vi.fn());

vi.mock("@archlex/icons", () => ({
  IconLoader: { registerProvider },
}));

let provider: CdnProviderDefinition | undefined;

beforeAll(async () => {
  const cdnModule = await import("./cdn.js");
  provider = Reflect.get(cdnModule, "GCP_CDN_PROVIDER") as
    | CdnProviderDefinition
    | undefined;

  await import("../index.js");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});

describe("GCP_CDN_PROVIDER", () => {
  it("exports a strict, release-labelled HTTPS provider definition", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    const url = new URL(provider.baseUrl);
    expect(provider.provider).toBe("gcp");
    expect(provider.baseUrl).toBe(
      "https://cdn.jsdelivr.net/gh/error505/azure-cloud-ai-visualizer@6b9e50e8f6e1e116644aafdd8f492ad041060149/frontend/public/gcp_icons",
    );
    expect(url.protocol).toBe("https:");
    expect(provider.releaseId).toBe("icepanel-gcp-2023-03-25");
    expect(provider.allowedHosts).toContain(url.hostname);
    expect(
      `${provider.baseUrl}/${provider.releaseId}`.toLowerCase(),
    ).not.toContain("latest");
  });

  it("pins every mapped IcePanel SVG with a raw SHA-256 digest", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    const mappingKeys = Object.keys(provider.mappings).sort();
    const integrityKeys = Object.keys(provider.integrity ?? {}).sort();
    expect(integrityKeys).toEqual(mappingKeys);
    for (const key of mappingKeys) {
      expect(provider.integrity?.[key], key).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("uses the reachable IcePanel filename for Pub/Sub", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    expect(provider.mappings["pub-sub"]).toBe("PubSub");
  });

  it("maps the catalog's pubsub key to the reachable IcePanel filename", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    expect(provider.mappings.pubsub).toBe("PubSub");
  });

  it("imports the provider package without legacy loader registration", () => {
    expect(registerProvider).not.toHaveBeenCalled();
  });
});
