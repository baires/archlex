import type { Env } from "./security.js";

/** Return promptly on cancellation while the owner retains any running-work slot. */
export async function waitWithSignal<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  let onAbort = (): void => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  try {
    return await Promise.race([work, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const ABSOLUTE_REQUEST_TIMEOUT_MS = 120_000;

export interface RequestAbortScope {
  signal: AbortSignal;
  timeoutMs: number;
  abort: (reason?: unknown) => void;
  cleanup: () => void;
}

function configuredTimeout(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function createRequestAbortScope(
  requestSignal: AbortSignal,
  env?: Env,
): RequestAbortScope {
  const configuredMaximum = configuredTimeout(env?.MCP_MAX_REQUEST_TIMEOUT_MS);
  const maximum = Math.min(
    configuredMaximum ?? ABSOLUTE_REQUEST_TIMEOUT_MS,
    ABSOLUTE_REQUEST_TIMEOUT_MS,
  );
  const timeoutMs = Math.min(
    configuredTimeout(env?.MCP_REQUEST_TIMEOUT_MS) ??
      DEFAULT_REQUEST_TIMEOUT_MS,
    maximum,
  );
  const controller = new AbortController();
  const relayAbort = (): void => controller.abort(requestSignal.reason);
  requestSignal.addEventListener("abort", relayAbort, { once: true });
  if (requestSignal.aborted) relayAbort();
  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException(`MCP request exceeded ${timeoutMs}ms`, "TimeoutError"),
      ),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    timeoutMs,
    abort: (reason?: unknown) => controller.abort(reason),
    cleanup: () => {
      clearTimeout(timeout);
      requestSignal.removeEventListener("abort", relayAbort);
    },
  };
}
