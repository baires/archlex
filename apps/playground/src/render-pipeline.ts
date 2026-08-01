import type { ArchLex, RenderPipelineOptions } from "@archlex/core";
import type { IconDiagnostic, IconLoader } from "@archlex/icons-core";
import type { RenderResult } from "@archlex/model";

export type RenderWithIconsOptions = Omit<RenderPipelineOptions, "icons">;

export interface RenderWithIconsResult {
  readonly renderResult: RenderResult;
  readonly iconWarnings: readonly IconDiagnostic[];
}

export async function renderWithIcons(
  archlex: ArchLex,
  iconLoader: IconLoader,
  source: string,
  options: RenderWithIconsOptions = {},
): Promise<RenderWithIconsResult> {
  const prepared = archlex.prepare(source, {
    validation: options.validation,
  });
  const { icons, diagnostics: iconWarnings } = await iconLoader.loadIcons(
    prepared.iconRequests,
    { signal: options.signal },
  );
  const renderResult = await archlex.renderPrepared(prepared, {
    ...options,
    icons,
  });

  return { renderResult, iconWarnings };
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
