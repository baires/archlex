import { describe, expect, it, vi } from "vitest";
import { WORKERS_ARTWORK_PIN } from "./catalog/index.js";
import { cloudflareProvider } from "./index.js";

describe("Workers catalog slice", () => {
  it("resolves workers and cloudflare.workers to one canonical resource", () => {
    const provider = cloudflareProvider();
    const unqualified = provider.resolveService("workers");
    const qualified = provider.resolveService("cloudflare.workers");

    expect(unqualified).toEqual(
      expect.objectContaining({
        id: "workers",
        displayName: "Workers",
        iconKey: "cloudflare.workers",
      }),
    );
    expect(qualified).toEqual(unqualified);
    expect(provider.supports("workers")).toBe(true);
    expect(provider.supports("cloudflare.workers")).toBe(true);
  });

  it("enumerates workers once", () => {
    const services = cloudflareProvider().listServices?.() ?? [];

    expect(services.filter((service) => service.id === "workers")).toEqual([
      expect.objectContaining({
        id: "workers",
        displayName: "Workers",
        category: "compute",
        aliases: ["cloudflare.workers"],
        allowedContainment: ["account"],
      }),
    ]);
    expect(new Set(services.map((service) => service.id)).size).toBe(
      services.length,
    );
  });

  it("pins the Workers revision and provides attributed official artwork", () => {
    expect(WORKERS_ARTWORK_PIN).toEqual({
      revision: "48f601bf4293fa9032505f858656d0db5b559131",
      sourcePath: "src/icons/workers.svg",
      sha256:
        "c7f249bbc68c02c2fdaa590c18378c0debde017e80772437ac474a9a508197a8",
    });
    const icon = cloudflareProvider().resolveService("workers")?.iconSvg;
    expect(icon).toContain("CC BY 4.0");
    expect(icon).toContain('fill="#fff"');
    expect(icon).toContain(WORKERS_ARTWORK_PIN.revision);
  });

  it("resolves workers without network requests", async () => {
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loaded = await import("./index.js");
    const provider = loaded.cloudflareProvider();

    expect(provider.id).toBe("cloudflare");
    expect(provider.resolveService("workers")?.displayName).toBe("Workers");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
