import type { CdnProviderDefinition } from "@archlex/icons-core";
import { beforeAll, describe, expect, it, vi } from "vitest";

const registerProvider = vi.hoisted(() => vi.fn());

vi.mock("@archlex/icons", () => ({
  IconLoader: { registerProvider },
}));

let provider: CdnProviderDefinition | undefined;

beforeAll(async () => {
  const cdnModule = await import("./cdn.js");
  provider = Reflect.get(cdnModule, "K8S_CDN_PROVIDER") as
    | CdnProviderDefinition
    | undefined;

  await import("../index.js");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});

describe("K8S_CDN_PROVIDER", () => {
  it("exports a strict, release-labelled HTTPS provider definition", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    const url = new URL(provider.baseUrl);
    expect(provider.provider).toBe("k8s");
    expect(provider.baseUrl).toBe(
      "https://cdn.jsdelivr.net/gh/kubernetes/community@43d6605709182dedb495a864930ece08666a1e67/icons/svg",
    );
    expect(url.protocol).toBe("https:");
    expect(provider.releaseId).toBe("43d6605709182dedb495a864930ece08666a1e67");
    expect(provider.allowedHosts).toContain(url.hostname);
    expect(
      `${provider.baseUrl}/${provider.releaseId}`.toLowerCase(),
    ).not.toContain("latest");
  });

  it("uses a version-pinned URL with git commit hash", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    // The URL contains a git commit hash, making it immutable
    expect(provider.baseUrl).toContain(
      "@43d6605709182dedb495a864930ece08666a1e67",
    );
  });

  it("maps catalog ids to reachable community icon paths", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    expect(provider.mappings.pod).toBe("resources/unlabeled/pod");
    expect(provider.mappings.deployment).toBe("resources/unlabeled/deploy");
    expect(provider.mappings.service).toBe("resources/unlabeled/svc");
    expect(provider.mappings.apiserver).toBe(
      "control_plane_components/labeled/api",
    );
  });

  it("records Apache-2.0 / CC-BY-4.0 attribution for the community icons", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    expect(provider.attribution.license).toBe("Apache-2.0 OR CC-BY-4.0");
    expect(provider.attribution.url).toContain("kubernetes/community");
  });

  it("imports the provider package without legacy loader registration", () => {
    expect(registerProvider).not.toHaveBeenCalled();
  });
});
