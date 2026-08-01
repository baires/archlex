import {
  CacheManager,
  type CdnAttribution,
  type SanitizedIcon,
  legacyCdnIconsDisabled,
  legacyIconDebugEnabled,
  sanitizeSvg as sanitizeSvgAsynchronously,
} from "@archlex/icons-node";
import { GENERIC_CLOUD_ICON_SVG } from "./fallback.js";
import { BaseCdnProvider, type CdnProviderOptions } from "./provider.js";
import { sanitizeSvg as sanitizeSvgSynchronously } from "./sanitizer.js";

/** @deprecated Use `CdnProviderDefinition` from `@archlex/icons-core`. */
export interface CdnProviderConfig {
  readonly provider: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly fileExtension: string;
  readonly attribution: CdnAttribution;
}

interface RegisteredProvider {
  readonly config: CdnProviderConfig;
  readonly provider: BaseCdnProvider;
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
  private cache = new CacheManager();
  private stats = emptyStats();
  private debug = legacyIconDebugEnabled();

  registerProvider(
    providerName: string,
    config: CdnProviderConfig,
    mappings: Record<string, string>,
    options: CdnProviderOptions = {},
  ): void {
    this.providers.set(providerName, {
      config,
      provider: new BaseCdnProvider(config, mappings, options),
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
    if (legacyCdnIconsDisabled()) {
      if (this.debug) {
        console.log(
          `[IconLoader] CDN disabled, skipping ${providerName}/${iconKey}`,
        );
      }
      return undefined;
    }

    const registered = this.providers.get(providerName);
    if (!registered) {
      providerStats.failures += 1;
      this.stats.failures += 1;
      return this.loadFallback(providerName, iconKey);
    }

    const request = { provider: providerName, key: iconKey };
    const cached = await this.cache.get(request);
    if (cached) {
      this.stats.cacheHits += 1;
      registered.iconsUsed.add(iconKey);
      return cached;
    }

    try {
      const fetched = await registered.provider.fetchIcon(iconKey);
      if (!fetched) {
        providerStats.failures += 1;
        this.stats.failures += 1;
        return this.loadFallback(providerName, iconKey);
      }

      providerStats.cdnFetches += 1;
      this.stats.cdnFetches += 1;
      const icon = await sanitizeSvgAsynchronously(
        providerName,
        iconKey,
        fetched.rawSvg,
      );
      await this.cache.set(request, icon, fetched.urlUsed);
      registered.iconsUsed.add(iconKey);
      return icon;
    } catch (error) {
      providerStats.failures += 1;
      this.stats.failures += 1;
      if (this.debug) {
        console.error(
          `[IconLoader] Error fetching ${providerName}/${iconKey}:`,
          error,
        );
      }
      const expired = await this.cache.get(request, { allowExpired: true });
      if (expired) {
        registered.iconsUsed.add(iconKey);
        return expired;
      }
      return this.loadFallback(providerName, iconKey);
    }
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
    this.cache = new CacheManager();
    this.stats = emptyStats();
    this.debug = legacyIconDebugEnabled();
  }

  private async loadFallback(
    provider: string,
    key: string,
  ): Promise<SanitizedIcon> {
    return sanitizeSvgAsynchronously(provider, key, GENERIC_CLOUD_ICON_SVG);
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
