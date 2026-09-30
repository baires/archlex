import { execSync } from "node:child_process";
import type { ResourceDefinition } from "@archlex/model";
import { describe, expect, it } from "vitest";
import {
  validateCloudflareRegistration,
  validateIncludedInventory,
} from "../scripts/validate-catalog.mjs";

const workers: ResourceDefinition = {
  id: "workers",
  displayName: "Workers",
  category: "compute",
  aliases: ["cloudflare.workers"],
  iconKey: "cloudflare.workers",
  allowedContainment: ["account"],
};

describe("Cloudflare catalog maintenance", () => {
  it("includes Cloudflare aliases, scopes, and artwork mappings in catalog validation", () => {
    const output = execSync("node scripts/validate-catalog.mjs", {
      encoding: "utf-8",
    });

    expect(output).toContain("Cloudflare Catalog:");
    expect(output).toContain("Alias Validation: PASS");
    expect(output).toContain("Scope Validation: PASS");
    expect(output).toContain("Artwork Mapping Validation: PASS");
    expect(output).toContain("Included catalog completeness: PASS");
    expect(output).toContain("Included resource contract: 92 resources");
    expect(output).toContain("RESULT: PASSED");
  });

  it("fails clearly when an included inventory entry has no catalog resource", () => {
    const diagnostics = validateIncludedInventory({
      inventory: {
        status: "approved",
        entries: [
          {
            status: "included",
            resourceId: "r2",
            iconKey: "cloudflare.r2",
            aliases: ["cloudflare.r2"],
            allowedContainment: ["account"],
          },
        ],
      },
      services: [workers],
      icons: new Set(["cloudflare.workers"]),
    });

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toContain(
      "Included inventory entry 'r2' is missing a catalog resource.",
    );
  });

  it("fails clearly when an included inventory entry has no icon mapping", () => {
    const diagnostics = validateIncludedInventory({
      inventory: {
        status: "approved",
        entries: [
          {
            status: "included",
            resourceId: "workers",
            iconKey: "cloudflare.workers",
            aliases: ["cloudflare.workers"],
            allowedContainment: ["account"],
          },
        ],
      },
      services: [{ ...workers, iconKey: undefined }],
      icons: new Set<string>(),
    });

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toContain(
      "Included inventory entry 'workers' is missing icon 'cloudflare.workers'.",
    );
  });

  it("rejects containment outside supported Cloudflare scopes", () => {
    const diagnostics = validateCloudflareRegistration({
      services: [{ ...workers, allowedContainment: ["region"] }],
      supportedScopes: ["account"],
      resolveService: (kind: string) =>
        kind === "workers" || kind === "cloudflare.workers"
          ? {
              id: "workers",
              displayName: "Workers",
              iconKey: "cloudflare.workers",
            }
          : undefined,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toContain(
      "Resource 'workers' containment scope 'region' is not a supported Cloudflare scope.",
    );
  });

  it("does not require excluded inventory entries", () => {
    const diagnostics = validateIncludedInventory({
      inventory: {
        status: "approved",
        entries: [
          { status: "excluded", resourceId: "logo", reason: "brand mark" },
          {
            status: "included",
            resourceId: "workers",
            iconKey: "cloudflare.workers",
            aliases: ["cloudflare.workers"],
            allowedContainment: ["account"],
          },
        ],
      },
      services: [workers],
      icons: new Set(["cloudflare.workers"]),
      supportedScopes: ["account"],
    });

    expect(diagnostics).toEqual([]);
  });
});
