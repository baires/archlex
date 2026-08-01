import {
  type CdnAttribution,
  type CdnProviderDefinition,
  type FetchIcon,
  type SanitizedIcon,
  createNodeIconLoader,
  legacyCdnIconsDisabled,
} from "@archlex/icons-node";
import { sanitizeSvg as sanitizeSvgSynchronously } from "./sanitizer.js";

/** @deprecated Use `CdnProviderDefinition` from `@archlex/icons-core`. */
export interface CdnProviderConfig {
  readonly provider: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly fileExtension: string;
  readonly attribution: CdnAttribution;
}

interface LegacyFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
}

type LegacyFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response | LegacyFetchResponse>;

interface LegacyProviderOptions {
  readonly fetchFn?: LegacyFetch;
}

interface RegisteredProvider {
  readonly config: CdnProviderConfig;
  readonly mappings: Readonly<Record<string, string>>;
  readonly fetchFn?: LegacyFetch;
  readonly iconsUsed: Set<string>;
}

interface MutableIconStats {
  totalRequests: number;
  bundledHits: number;
  cacheHits: number;
  cdnFetches: number;
  failures: number;
  byProvider: Record<
    string,
    { requests: number; cdnFetches: number; failures: number }
  >;
}

/** @deprecated Use `CreateNodeIconLoaderOptions` and `createNodeIconLoader`. */
export interface IconStats {
  readonly totalRequests: number;
  readonly bundledHits: number;
  readonly cacheHits: number;
  readonly cdnFetches: number;
  readonly failures: number;
  readonly byProvider: Readonly<
    Record<
      string,
      {
        readonly requests: number;
        readonly cdnFetches: number;
        readonly failures: number;
      }
    >
  >;
}

/** @deprecated Provider attribution is available from provider definitions. */
export interface ProviderAttributionReport {
  readonly provider: string;
  readonly source: string;
  readonly url: string;
  readonly iconsUsed: readonly string[];
}

class LegacyIconLoader {
  private readonly providers = new Map<string, RegisteredProvider>();
  private stats = emptyStats();

  registerProvider(
    providerName: string,
    config: CdnProviderConfig,
    mappings: Record<string, string>,
    options: LegacyProviderOptions = {},
  ): void {
    this.providers.set(providerName, {
      config,
      mappings,
      fetchFn: options.fetchFn,
      iconsUsed: new Set(),
    });
    this.stats.byProvider[providerName] ??= emptyProviderStats();
  }

  async get(
    providerName: string,
    iconKey: string,
  ): Promise<SanitizedIcon | undefined> {
    this.stats.totalRequests += 1;
    this.stats.byProvider[providerName] ??= emptyProviderStats();
    const providerStats = this.stats.byProvider[providerName];
    providerStats.requests += 1;
    if (legacyCdnIconsDisabled()) return undefined;

    const registered = this.providers.get(providerName);
    if (!registered) {
      providerStats.failures += 1;
      this.stats.failures += 1;
      return this.loadFallback(providerName, iconKey);
    }

    let fetchCount = 0;
    const fetchFn = adaptLegacyFetch(
      registered.fetchFn ?? globalThis.fetch.bind(globalThis),
      () => {
        fetchCount += 1;
        providerStats.cdnFetches += 1;
        this.stats.cdnFetches += 1;
      },
    );
    const loader = createNodeIconLoader({
      providers: [toProviderDefinition(providerName, registered)],
      fetchFn,
    });
    const result = await loader.loadIcons([
      { provider: providerName, key: iconKey },
    ]);
    const icon = result.icons.get(`${providerName}:${iconKey}`);
    if (result.diagnostics.length > 0) {
      providerStats.failures += 1;
      this.stats.failures += 1;
    } else {
      if (fetchCount === 0) this.stats.cacheHits += 1;
      registered.iconsUsed.add(iconKey);
    }
    return icon;
  }

  getStats(): IconStats {
    return structuredClone(this.stats);
  }

  getAttributions(): ProviderAttributionReport[] {
    return Array.from(this.providers, ([provider, registered]) => ({
      provider,
      source: registered.config.attribution.source,
      url: registered.config.attribution.url,
      iconsUsed: Array.from(registered.iconsUsed).sort(),
    })).filter((report) => report.iconsUsed.length > 0);
  }

  reset(): void {
    this.providers.clear();
    this.stats = emptyStats();
  }

  private async loadFallback(
    provider: string,
    key: string,
  ): Promise<SanitizedIcon> {
    const loader = createNodeIconLoader({ providers: [] });
    const result = await loader.loadIcons([{ provider, key }]);
    return result.icons.get(`${provider}:${key}`) as SanitizedIcon;
  }
}

/**
 * @deprecated Use `createNodeIconLoader`. This singleton only preserves the
 * pre-adapter Node call shape while provider packages migrate.
 */
export const IconLoader = new LegacyIconLoader();

/**
 * @deprecated Use the asynchronous `sanitizeSvg` from `@archlex/icons-core`.
 * This synchronous wrapper remains Node-only through the facade export map.
 */
export function sanitizeSvg(
  provider: string,
  key: string,
  rawSvg: string,
): SanitizedIcon {
  return sanitizeSvgSynchronously(provider, key, rawSvg);
}

function adaptLegacyFetch(
  legacyFetch: LegacyFetch,
  recordSuccessfulFetch: () => void,
): FetchIcon {
  return async (input, init) => {
    const response = await legacyFetch(input, init);
    if (response.ok) recordSuccessfulFetch();
    if (response instanceof Response) return response;

    const body = response.ok ? await response.text() : null;
    return new Response(body, {
      status: response.status ?? (response.ok ? 200 : 500),
    });
  };
}

function toProviderDefinition(
  provider: string,
  registered: RegisteredProvider,
): CdnProviderDefinition {
  const releaseId = "archlex-legacy-v1";
  const baseUrl = new URL(registered.config.baseUrl);
  const segments = decodeURIComponent(baseUrl.pathname)
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.replace(/@(latest|next|main|master)$/i, `@${releaseId}`),
    )
    .map((segment) =>
      /^(latest|next|main|master)$/i.test(segment) ? releaseId : segment,
    );
  if (!segments.some((segment) => segment.endsWith(releaseId))) {
    segments.push(releaseId);
  }
  baseUrl.pathname = `/${segments.join("/")}`;

  return {
    provider,
    baseUrl: baseUrl.href,
    allowedHosts: [baseUrl.hostname],
    releaseId,
    fileExtension: registered.config.fileExtension,
    mappings: registered.mappings,
    attribution: registered.config.attribution,
    timeoutMs: 10_000,
    maxResponseBytes: 1_000_000,
  };
}

function emptyStats(): MutableIconStats {
  return {
    totalRequests: 0,
    bundledHits: 0,
    cacheHits: 0,
    cdnFetches: 0,
    failures: 0,
    byProvider: {},
  };
}

function emptyProviderStats(): {
  requests: number;
  cdnFetches: number;
  failures: number;
} {
  return { requests: 0, cdnFetches: 0, failures: 0 };
}
