import { readFile } from "node:fs/promises";
import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { createBrowserIconLoader } from "@archlex/icons-browser";
import type { CdnProviderDefinition, FetchIcon } from "@archlex/icons-core";
import { describe, expect, it, vi } from "vitest";
import {
  createGuardedOperationHandlers,
  renderWithIcons,
} from "../apps/playground/src/render-pipeline.js";

const SAFE_ICON_FIXTURE_URL = new URL(
  "./fixtures/icons/runtime-service.svg",
  import.meta.url,
);
const INVALID_ICON_FIXTURE_URL = new URL(
  "./fixtures/icons/invalid-active.svg",
  import.meta.url,
);

const AWS_FIXTURE_PROVIDER: CdnProviderDefinition = {
  provider: "aws",
  baseUrl: "https://icons.test/releases/2026-08-01",
  allowedHosts: ["icons.test"],
  releaseId: "2026-08-01",
  fileExtension: ".svg",
  mappings: { "app-runner": "runtime-service" },
  attribution: {
    source: "ArchLex test fixtures",
    license: "MIT",
    url: "https://icons.test/license",
  },
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
};

function fetchFromFixture(url: URL): FetchIcon {
  return vi.fn(
    async () =>
      new Response(await readFile(url, "utf8"), {
        headers: { "content-type": "image/svg+xml" },
      }),
  );
}

describe("playground dynamic icon regressions", () => {
  it("fetches once for three nodes with the same missing icon", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const prepared = archlex.prepare(
      'first: app-runner["First"]\nsecond: app-runner["Second"]\nthird: app-runner["Third"]',
    );
    const fetchFn = fetchFromFixture(SAFE_ICON_FIXTURE_URL);
    const loader = createBrowserIconLoader({
      providers: [AWS_FIXTURE_PROVIDER],
      fetchFn,
    });

    const result = await loader.loadIcons(prepared.iconRequests);

    expect(prepared.graph.nodes).toHaveLength(3);
    expect(prepared.iconRequests).toEqual([
      { provider: "aws", key: "app-runner" },
    ]);
    expect(result.icons.has("aws:app-runner")).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("embeds bundled and fixture-fetched artwork in one diagram", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const loader = createBrowserIconLoader({
      providers: [AWS_FIXTURE_PROVIDER],
      fetchFn: fetchFromFixture(SAFE_ICON_FIXTURE_URL),
    });

    const { renderResult, iconWarnings } = await renderWithIcons(
      archlex,
      loader,
      "lambda > app-runner",
    );

    expect(renderResult.graph.nodes).toHaveLength(2);
    expect(renderResult.svg).toContain("#ED7100");
    expect(renderResult.svg).toContain("#123456");
    expect(iconWarnings).toEqual([]);
  });

  it("renders a complete fallback diagram when fixture SVG sanitization fails", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const loader = createBrowserIconLoader({
      providers: [AWS_FIXTURE_PROVIDER],
      fetchFn: fetchFromFixture(INVALID_ICON_FIXTURE_URL),
    });

    const { renderResult, iconWarnings } = await renderWithIcons(
      archlex,
      loader,
      "app-runner",
    );

    expect(renderResult.graph.nodes).toHaveLength(1);
    expect(renderResult.svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(renderResult.svg).toContain("#6B7280");
    expect(iconWarnings).toEqual([
      expect.objectContaining({
        provider: "aws",
        key: "app-runner",
        code: "ICON_INVALID",
      }),
    ]);
  });
});

describe("guarded playground state application", () => {
  it("does not apply a late stale success", () => {
    let currentOperationId = 1;
    const applied: string[] = [];
    const handlers = createGuardedOperationHandlers<string>({
      operationId: 1,
      currentOperationId: () => currentOperationId,
      signal: new AbortController().signal,
      onSuccess: (value) => applied.push(value),
      onFailure: (error) => applied.push(String(error)),
    });

    currentOperationId = 2;
    handlers.onSuccess("late SVG");

    expect(applied).toEqual([]);
  });

  it("does not apply a late stale rejection", () => {
    let currentOperationId = 1;
    const applied: string[] = [];
    const handlers = createGuardedOperationHandlers<string>({
      operationId: 1,
      currentOperationId: () => currentOperationId,
      signal: new AbortController().signal,
      onSuccess: (value) => applied.push(value),
      onFailure: (error) => applied.push(String(error)),
    });

    currentOperationId = 2;
    handlers.onFailure(new Error("late failure"));

    expect(applied).toEqual([]);
  });

  it("applies current success and non-abort rejection handlers", () => {
    const applied: string[] = [];
    const options = {
      operationId: 3,
      currentOperationId: () => 3,
      signal: new AbortController().signal,
      onSuccess: (value: string) => applied.push(`success:${value}`),
      onFailure: (error: unknown) => applied.push(`failure:${String(error)}`),
    };

    createGuardedOperationHandlers(options).onSuccess("SVG");
    createGuardedOperationHandlers(options).onFailure("render error");

    expect(applied).toEqual(["success:SVG", "failure:render error"]);
  });
});
