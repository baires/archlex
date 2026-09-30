import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { WORKERS_ARTWORK_PIN } from "./catalog/index.js";
import {
  CLOUDFLARE_ARTWORK_PINS,
  CLOUDFLARE_ICONS,
  CLOUDFLARE_INCLUDED_IDS,
} from "./index.js";
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

describe("included Cloudflare resource integration", () => {
  it("ships exactly the 92 included resources documented in the README", () => {
    const services = cloudflareProvider().listServices?.() ?? [];
    expect(CLOUDFLARE_INCLUDED_IDS).toHaveLength(92);
    expect(services.map((service) => service.id).sort()).toEqual(
      [...CLOUDFLARE_INCLUDED_IDS].sort(),
    );
    const readme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf8",
    );
    const rows = [...readme.matchAll(/^\| `([^`]+)` \| (.+) \| ([^|]+) \|$/gm)];
    expect(rows).toHaveLength(92);
    for (const service of services) {
      expect(
        rows.filter((row) => row[1] === service.id).map((row) => row.slice(1)),
      ).toEqual([[service.id, service.displayName, service.category]]);
    }
  });
  it("resolves every canonical id and inventory alias once with bundled artwork", () => {
    const provider = cloudflareProvider();
    const services = provider.listServices?.() ?? [];
    const ids = new Set<string>();
    const aliases = new Set<string>();
    for (const service of services) {
      expect(ids.has(service.id)).toBe(false);
      ids.add(service.id);
      const canonical = provider.resolveService(service.id);
      expect(canonical?.displayName).toBe(service.displayName);
      expect(canonical?.iconKey).toBe(`cloudflare.${service.id}`);
      expect(canonical?.iconSvg).toBe(
        CLOUDFLARE_ICONS[service.id]?.svgFragment,
      );
      expect(canonical?.iconSvg).toContain("CC BY 4.0");
      for (const alias of service.aliases) {
        expect(aliases.has(alias.toLowerCase())).toBe(false);
        aliases.add(alias.toLowerCase());
        expect(provider.resolveService(alias)).toEqual(canonical);
      }
      expect(provider.resolveService(`cloudflare.${service.id}`)).toEqual(
        canonical,
      );
      expect(service.allowedContainment).toEqual(["account"]);
      expect([
        "ai-ml",
        "compute",
        "networking",
        "management",
        "messaging",
        "monitoring",
        "security",
        "storage",
      ]).toContain(service.category);
    }
  });

  it("keeps local raw source and generated checksums tied to each provenance pin", () => {
    const services = cloudflareProvider().listServices?.() ?? [];
    expect(Object.keys(CLOUDFLARE_ICONS).sort()).toEqual(
      services.map((service) => service.id).sort(),
    );
    expect(Object.keys(CLOUDFLARE_ARTWORK_PINS).sort()).toEqual(
      services.map((service) => service.id).sort(),
    );
    for (const service of services) {
      const pin = CLOUDFLARE_ARTWORK_PINS[service.id];
      expect(pin.revision).toBe("48f601bf4293fa9032505f858656d0db5b559131");
      const source = readFileSync(
        new URL(
          `../assets/official/${basename(pin.sourcePath)}`,
          import.meta.url,
        ),
      );
      expect(createHash("sha256").update(source).digest("hex")).toBe(
        pin.sha256,
      );
      const icon = CLOUDFLARE_ICONS[service.id];
      expect(createHash("sha256").update(icon.svgFragment).digest("hex")).toBe(
        icon.checksum,
      );
      expect(icon.svgFragment).toContain(pin.sourcePath);
    }
  });
});
