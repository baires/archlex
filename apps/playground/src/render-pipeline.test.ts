import { awsProvider, createArchLex } from "@archlex/core";
import type {
  IconDiagnostic,
  IconLoadResult,
  IconLoader,
  SanitizedIcon,
} from "@archlex/icons-core";
import { describe, expect, it } from "vitest";
import {
  isAbortError,
  isCurrentOperation,
  renderWithIcons,
} from "./render-pipeline.js";

const CDN_ICON: SanitizedIcon = {
  provider: "aws",
  key: "app-runner",
  checksum: "sha256:cdn-app-runner",
  viewBox: "0 0 64 64",
  svgFragment:
    '<svg viewBox="0 0 64 64"><path fill="#123456" d="M0 0h64v64H0z"/></svg>',
};

const FALLBACK_ICON: SanitizedIcon = {
  ...CDN_ICON,
  checksum: "sha256:fallback-app-runner",
  svgFragment:
    '<svg viewBox="0 0 64 64"><circle fill="#abcdef" cx="32" cy="32" r="32"/></svg>',
};

const FETCH_WARNING: IconDiagnostic = {
  provider: "aws",
  key: "app-runner",
  code: "ICON_FETCH_FAILED",
  message: "Unable to fetch aws/app-runner",
};

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

describe("renderWithIcons", () => {
  it("renders a CDN-only icon returned by the loader", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const iconLoader: IconLoader = {
      async loadIcons(requests) {
        const requestedAppRunner = requests.some(
          (request) =>
            request.provider === "aws" && request.key === "app-runner",
        );
        return {
          icons: requestedAppRunner
            ? new Map([["aws:app-runner", CDN_ICON]])
            : new Map(),
          diagnostics: [],
        };
      },
    };

    const result = await renderWithIcons(archlex, iconLoader, "apprunner");

    expect(result.renderResult.svg).toContain("#123456");
    expect(result.renderResult.graph.nodes[0]?.icon).toBe(CDN_ICON.svgFragment);
    expect(result.iconWarnings).toEqual([]);
  });

  it("renders a fallback icon while keeping fetch warnings separate", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const iconLoader = loaderReturning({
      icons: new Map([["aws:app-runner", FALLBACK_ICON]]),
      diagnostics: [FETCH_WARNING],
    });

    const result = await renderWithIcons(archlex, iconLoader, "apprunner");

    expect(result.renderResult.svg).toContain("#abcdef");
    expect(result.iconWarnings).toEqual([FETCH_WARNING]);
    expect(
      result.renderResult.diagnostics.some(
        (diagnostic) => diagnostic.code === FETCH_WARNING.code,
      ),
    ).toBe(false);
  });

  it("rejects instead of completing when icon loading is aborted", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const iconLoader: IconLoader = {
      loadIcons(_requests, options) {
        return new Promise((_resolve, reject) => {
          const rejectAbort = () =>
            reject(new DOMException("The operation was aborted", "AbortError"));
          if (options?.signal?.aborted) {
            rejectAbort();
            return;
          }
          options?.signal?.addEventListener("abort", rejectAbort, {
            once: true,
          });
        });
      },
    };
    const controller = new AbortController();

    const pending = renderWithIcons(archlex, iconLoader, "apprunner", {
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("prevents operation 1 from applying after operation 2 finishes", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const firstLoad = deferred<IconLoadResult>();
    const secondLoad = deferred<IconLoadResult>();
    let loadCount = 0;
    const iconLoader: IconLoader = {
      loadIcons() {
        loadCount += 1;
        return loadCount === 1 ? firstLoad.promise : secondLoad.promise;
      },
    };
    let currentOperationId = 0;
    const appliedSvgs: string[] = [];

    const firstOperationId = ++currentOperationId;
    const firstRender = renderWithIcons(archlex, iconLoader, "apprunner");
    const secondOperationId = ++currentOperationId;
    const secondRender = renderWithIcons(archlex, iconLoader, "apprunner");

    secondLoad.resolve({
      icons: new Map([["aws:app-runner", FALLBACK_ICON]]),
      diagnostics: [],
    });
    const secondResult = await secondRender;
    if (isCurrentOperation(secondOperationId, currentOperationId)) {
      appliedSvgs.push(secondResult.renderResult.svg);
    }

    firstLoad.resolve({
      icons: new Map([["aws:app-runner", CDN_ICON]]),
      diagnostics: [],
    });
    const firstResult = await firstRender;
    if (isCurrentOperation(firstOperationId, currentOperationId)) {
      appliedSvgs.push(firstResult.renderResult.svg);
    }

    expect(appliedSvgs).toHaveLength(1);
    expect(appliedSvgs[0]).toContain("#abcdef");
    expect(appliedSvgs[0]).not.toContain("#123456");
  });
});

describe("isAbortError", () => {
  it("recognizes expected cancellation without swallowing render failures", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("Rendering failed"))).toBe(false);
  });
});
