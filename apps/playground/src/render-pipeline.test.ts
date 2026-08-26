import { awsProvider, createArchLex } from "@archlex/core";
import type {
  IconDiagnostic,
  IconLoadResult,
  IconLoader,
  SanitizedIcon,
} from "@archlex/icons-core";
import type { CloudProvider } from "@archlex/model";
import { describe, expect, it } from "vitest";
import {
  isAbortError,
  isCurrentOperation,
  renderProgressively,
} from "./render-pipeline.js";

const UNRESOLVED_KIND = "runtime-service";

const CDN_ICON: SanitizedIcon = {
  provider: "test",
  key: UNRESOLVED_KIND,
  checksum: "sha256:cdn-runtime-service",
  viewBox: "0 0 64 64",
  svgFragment:
    '<svg viewBox="0 0 64 64"><path fill="#123456" d="M0 0h64v64H0z"/></svg>',
};

const FALLBACK_ICON: SanitizedIcon = {
  ...CDN_ICON,
  checksum: "sha256:fallback-runtime-service",
  svgFragment:
    '<svg viewBox="0 0 64 64"><circle fill="#abcdef" cx="32" cy="32" r="32"/></svg>',
};

const FETCH_WARNING: IconDiagnostic = {
  provider: "test",
  key: UNRESOLVED_KIND,
  code: "ICON_FETCH_FAILED",
  message: "Unable to fetch test/runtime-service",
};

function createUnresolvedIconProvider(): CloudProvider {
  return {
    id: "test",
    name: "Test Provider",
    catalogVersion: "test",
    supports(serviceKind: string): boolean {
      return (
        serviceKind === UNRESOLVED_KIND ||
        serviceKind === `test.${UNRESOLVED_KIND}`
      );
    },
    resolveService(serviceKind: string) {
      if (
        serviceKind !== UNRESOLVED_KIND &&
        serviceKind !== `test.${UNRESOLVED_KIND}`
      ) {
        return undefined;
      }
      return {
        id: UNRESOLVED_KIND,
        displayName: "Runtime Service",
        iconKey: `test.${UNRESOLVED_KIND}`,
      };
    },
    validateGraph() {
      return [];
    },
  };
}

function loaderReturning(result: IconLoadResult): IconLoader {
  return {
    async loadIcons() {
      return result;
    },
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("renderProgressively", () => {
  it(
    "resolves the base diagram while remote icon loading is pending",
    { timeout: 15_000 },
    async () => {
      const archlex = createArchLex({
        providers: [createUnresolvedIconProvider()],
      });
      const iconLoad = deferred<IconLoadResult>();
      const iconLoader: IconLoader = {
        loadIcons() {
          return iconLoad.promise;
        },
      };

      const operation = renderProgressively(
        archlex,
        iconLoader,
        "app: runtime-service",
      );
      const base = await operation.base;

      expect(base.graph.nodes[0]?.icon).toBeUndefined();
      expect(base.svg).not.toContain("#123456");
      expect(operation.hydrated).not.toBeNull();

      iconLoad.resolve({
        icons: new Map([["test:runtime-service", CDN_ICON]]),
        diagnostics: [],
      });
      await operation.hydrated;
    },
  );

  it("hydrates a remote icon after the base diagram", async () => {
    const archlex = createArchLex({
      providers: [createUnresolvedIconProvider()],
    });
    const iconLoader = loaderReturning({
      icons: new Map([["test:runtime-service", CDN_ICON]]),
      diagnostics: [],
    });

    const operation = renderProgressively(
      archlex,
      iconLoader,
      "app: runtime-service",
    );
    const base = await operation.base;
    const hydrated = await operation.hydrated;

    expect(base.svg).not.toContain("#123456");
    expect(hydrated?.renderResult.svg).toContain("#123456");
    expect(hydrated?.renderResult.graph.nodes[0]?.icon).toBe(
      CDN_ICON.svgFragment,
    );
  });

  it("keeps fallback warnings separate from semantic diagnostics", async () => {
    const archlex = createArchLex({
      providers: [createUnresolvedIconProvider()],
    });
    const iconLoader = loaderReturning({
      icons: new Map([["test:runtime-service", FALLBACK_ICON]]),
      diagnostics: [FETCH_WARNING],
    });

    const operation = renderProgressively(
      archlex,
      iconLoader,
      "app: runtime-service",
    );
    const hydrated = await operation.hydrated;

    expect(hydrated?.renderResult.svg).toContain("#abcdef");
    expect(hydrated?.iconWarnings).toEqual([FETCH_WARNING]);
    expect(
      hydrated?.renderResult.diagnostics.some(
        (diagnostic) => diagnostic.code === FETCH_WARNING.code,
      ),
    ).toBe(false);
  });

  it("skips icon loading when the prepared graph has no unresolved icons", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    let loadCount = 0;
    const iconLoader: IconLoader = {
      async loadIcons() {
        loadCount += 1;
        return { icons: new Map(), diagnostics: [] };
      },
    };

    const operation = renderProgressively(archlex, iconLoader, "lambda");

    await operation.base;
    expect(operation.hydrated).toBeNull();
    expect(loadCount).toBe(0);
  });

  it("keeps a successful base result when icon loading fails", async () => {
    const archlex = createArchLex({
      providers: [createUnresolvedIconProvider()],
    });
    const iconLoader: IconLoader = {
      async loadIcons() {
        throw new Error("icon CDN unavailable");
      },
    };

    const operation = renderProgressively(
      archlex,
      iconLoader,
      "app: runtime-service",
    );

    await expect(operation.base).resolves.toMatchObject({
      graph: { nodes: [expect.objectContaining({ id: "app" })] },
    });
    await expect(operation.hydrated).rejects.toThrow("icon CDN unavailable");
  });
});

describe("isAbortError", () => {
  it("recognizes expected cancellation without swallowing render failures", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("Rendering failed"))).toBe(false);
  });
});
