import type { ArchLex, RenderPipelineOptions } from "@archlex/core";
import type { IconDiagnostic, IconLoader } from "@archlex/icons-core";
import type { RenderResult } from "@archlex/model";

export type RenderWithIconsOptions = Omit<RenderPipelineOptions, "icons">;

export interface RenderWithIconsResult {
  readonly renderResult: RenderResult;
  readonly iconWarnings: readonly IconDiagnostic[];
}

export interface GuardedOperationHandlerOptions<T> {
  readonly operationId: number;
  readonly currentOperationId: () => number;
  readonly signal: AbortSignal;
  readonly onSuccess: (value: T) => void;
  readonly onFailure: (error: unknown) => void;
}

export interface GuardedOperationHandlers<T> {
  readonly onSuccess: (value: T) => void;
  readonly onFailure: (error: unknown) => void;
}

export interface ProgressiveRenderOperation {
  readonly base: Promise<RenderResult>;
  readonly hydrated: Promise<RenderWithIconsResult> | null;
}

export function renderProgressively(
  archlex: ArchLex,
  iconLoader: IconLoader,
  source: string,
  options: RenderWithIconsOptions = {},
): ProgressiveRenderOperation {
  const prepared = archlex.prepare(source, {
    validation: options.validation,
  });
  const base = archlex.renderPrepared(prepared, options);

  if (prepared.iconRequests.length === 0) {
    return { base, hydrated: null };
  }

  const iconLoad = iconLoader.loadIcons(prepared.iconRequests, {
    signal: options.signal,
  });
  iconLoad.catch(() => {});

  const hydrated = Promise.all([base, iconLoad]).then(
    async ([, { icons, diagnostics: iconWarnings }]) => {
      const renderResult = await archlex.renderPrepared(prepared, {
        ...options,
        icons,
      });
      return { renderResult, iconWarnings };
    },
  );
  hydrated.catch(() => {});

  return { base, hydrated };
}

export function isCurrentOperation(
  operationId: number,
  currentOperationId: number,
): boolean {
  return operationId === currentOperationId;
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function createGuardedOperationHandlers<T>(
  options: GuardedOperationHandlerOptions<T>,
): GuardedOperationHandlers<T> {
  const isCurrent = () =>
    !options.signal.aborted &&
    isCurrentOperation(options.operationId, options.currentOperationId());

  return {
    onSuccess(value) {
      if (isCurrent()) options.onSuccess(value);
    },
    onFailure(error) {
      if (!isAbortError(error) && isCurrent()) options.onFailure(error);
    },
  };
}
