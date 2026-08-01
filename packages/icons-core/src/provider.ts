import type {
  CdnProvider,
  CdnProviderDefinition,
  CdnProviderFetchResult,
  FetchIcon,
  IconDiagnostic,
} from "./types.js";

const MOVING_RELEASES = new Set(["latest", "next", "main", "master"]);
const SHA_256_HEX = /^[a-f0-9]{64}$/i;

export class CdnProviderError extends Error {
  readonly code: IconDiagnostic["code"];

  constructor(code: IconDiagnostic["code"], message: string) {
    super(message);
    this.name = "CdnProviderError";
    this.code = code;
  }
}

export function createCdnProvider(
  definition: CdnProviderDefinition,
  fetchFn: FetchIcon,
): CdnProvider {
  const { baseUrl, requiresIntegrity } = validateDefinition(definition);

  return {
    definition,
    async fetchIcon(key, options = {}) {
      if (requiresIntegrity && !definition.integrity?.[key]) return undefined;
      let lastFailure: CdnProviderError | undefined;
      for (const candidate of candidateNames(definition, key)) {
        const url = new URL(
          `${encodeURIComponent(candidate)}${definition.fileExtension}`,
          `${baseUrl.href.replace(/\/$/, "")}/`,
        );

        try {
          const { response, bytes } = await fetchResponse(
            fetchFn,
            url,
            definition.timeoutMs,
            definition.maxResponseBytes,
            definition.provider,
            key,
            options.signal,
          );
          if (!response.ok) {
            if (response.status !== 404) {
              lastFailure = new CdnProviderError(
                "ICON_FETCH_FAILED",
                `Failed to fetch ${definition.provider}/${key}: HTTP ${response.status}`,
              );
            }
            continue;
          }

          if (!bytes) continue;
          await verifyIntegrity(definition, key, bytes);
          return {
            rawSvg: new TextDecoder().decode(bytes),
            source: url.href,
          } satisfies CdnProviderFetchResult;
        } catch (error) {
          if (isAbortError(error) && options.signal?.aborted) throw error;
          if (error instanceof CdnProviderError) {
            if (
              error.code === "ICON_INVALID" ||
              error.code === "ICON_TOO_LARGE"
            ) {
              throw error;
            }
            lastFailure = error;
          } else {
            lastFailure = new CdnProviderError(
              "ICON_FETCH_FAILED",
              `Failed to fetch ${definition.provider}/${key}: ${errorMessage(error)}`,
            );
          }
        }
      }

      if (lastFailure) throw lastFailure;
      return undefined;
    },
  };
}

export function candidateNames(
  definition: Pick<CdnProviderDefinition, "mappings">,
  key: string,
): readonly string[] {
  const words = key.split("-");
  const pascalCase = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  const camelCase =
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  const lowercase = key.toLowerCase().replace(/-/g, "");
  return Array.from(
    new Set([
      definition.mappings[key] ?? key,
      pascalCase,
      camelCase,
      lowercase,
    ]),
  );
}

function validateDefinition(definition: CdnProviderDefinition): {
  baseUrl: URL;
  requiresIntegrity: boolean;
} {
  let url: URL;
  try {
    url = new URL(definition.baseUrl);
  } catch {
    throw new Error(
      `CDN provider ${definition.provider} must have a valid HTTPS base URL`,
    );
  }
  if (url.protocol !== "https:") {
    throw new Error(
      `CDN provider ${definition.provider} must use an HTTPS base URL`,
    );
  }
  const allowedHosts = definition.allowedHosts.map((host) =>
    host.toLowerCase(),
  );
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(
      `CDN provider ${definition.provider} host is not in its allowlist`,
    );
  }

  const pathSegments = decodePathname(url.pathname)
    .split("/")
    .filter(Boolean)
    .flatMap((segment) => segment.toLowerCase().split("@"));
  if (pathSegments.some((segment) => MOVING_RELEASES.has(segment))) {
    throw new Error(
      `CDN provider ${definition.provider} URL must be version-pinned`,
    );
  }

  const releaseId = definition.releaseId.trim();
  const hasVersionedUrl = decodePathname(url.pathname)
    .split("/")
    .filter(Boolean)
    .some(
      (segment) => segment === releaseId || segment.endsWith(`@${releaseId}`),
    );
  const integrityValues = Object.values(definition.integrity ?? {});
  const hasIntegrity = integrityValues.length > 0;
  if (!hasVersionedUrl && !hasIntegrity) {
    throw new Error(
      `CDN provider ${definition.provider} requires a version-pinned URL or per-icon integrity values`,
    );
  }
  if (integrityValues.some((value) => !SHA_256_HEX.test(value))) {
    throw new Error(
      `CDN provider ${definition.provider} integrity values must be SHA-256 hex digests`,
    );
  }
  if (
    !Number.isSafeInteger(definition.timeoutMs) ||
    definition.timeoutMs <= 0
  ) {
    throw new Error("CDN provider timeoutMs must be a positive integer");
  }
  if (
    !Number.isSafeInteger(definition.maxResponseBytes) ||
    definition.maxResponseBytes <= 0
  ) {
    throw new Error("CDN provider maxResponseBytes must be a positive integer");
  }
  if (
    !definition.fileExtension.startsWith(".") ||
    definition.fileExtension.includes("/")
  ) {
    throw new Error("CDN provider fileExtension must be a file extension");
  }
  return { baseUrl: url, requiresIntegrity: !hasVersionedUrl };
}

async function fetchResponse(
  fetchFn: FetchIcon,
  url: URL,
  timeoutMs: number,
  maximumBytes: number,
  provider: string,
  key: string,
  callerSignal?: AbortSignal,
): Promise<{ response: Response; bytes?: Uint8Array }> {
  if (callerSignal?.aborted) throw abortError();

  const controller = new AbortController();
  let timedOut = false;
  const handleCallerAbort = () => controller.abort();
  callerSignal?.addEventListener("abort", handleCallerAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    const bytes = response.ok
      ? await readResponseBytes(response, maximumBytes, provider, key)
      : undefined;
    return { response, bytes };
  } catch (error) {
    if (callerSignal?.aborted) throw abortError();
    if (timedOut) {
      throw new CdnProviderError(
        "ICON_FETCH_FAILED",
        `Timed out fetching ${url.href} after ${timeoutMs}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", handleCallerAbort);
  }
}

async function readResponseBytes(
  response: Response,
  maximumBytes: number,
  provider: string,
  key: string,
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > maximumBytes) {
    throw tooLarge(provider, key, maximumBytes);
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maximumBytes) {
      await reader.cancel();
      throw tooLarge(provider, key, maximumBytes);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function verifyIntegrity(
  definition: CdnProviderDefinition,
  key: string,
  bytes: Uint8Array,
): Promise<void> {
  const expected = definition.integrity?.[key];
  if (!expected) return;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer,
  );
  const actual = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actual !== expected.toLowerCase()) {
    throw new CdnProviderError(
      "ICON_INVALID",
      `Integrity check failed for ${definition.provider}/${key}`,
    );
  }
}

function tooLarge(
  provider: string,
  key: string,
  maximumBytes: number,
): CdnProviderError {
  return new CdnProviderError(
    "ICON_TOO_LARGE",
    `SVG for ${provider}/${key} exceeds ${maximumBytes} bytes`,
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted", "AbortError");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    throw new Error("CDN provider base URL contains an invalid path encoding");
  }
}
