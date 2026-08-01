import { CacheManager } from "./cache.js";
import { GENERIC_CLOUD_ICON_SVG } from "./fallback.js";
import { BaseCdnProvider, type CdnProviderOptions } from "./provider.js";
import { sanitizeSvg } from "./sanitizer.js";
import type {
  CdnProviderConfig,
  IconStats,
  ProviderAttributionReport,
  SanitizedIcon,
} from "./types.js";

interface RegisteredProvider {
  provider: BaseCdnProvider;
  config: CdnProviderConfig;
  iconsUsed: Set<string>;
}

// Mutable version of IconStats for internal use
interface MutableIconStats {
  totalRequests: number;
  bundledHits: number;
  cacheHits: number;
  cdnFetches: number;
  failures: number;
  byProvider: Record<
    string,
    {
      requests: number;
      cdnFetches: number;
      failures: number;
    }
  >;
}

class IconLoaderClass {
  private providers = new Map<string, RegisteredProvider>();
  private cache: CacheManager;
  private stats: MutableIconStats = {
    totalRequests: 0,
    bundledHits: 0,
    cacheHits: 0,
    cdnFetches: 0,
    failures: 0,
    byProvider: {},
  };
  private debug: boolean;

  constructor() {
    this.cache = new CacheManager();
    this.debug = process.env.ARCHLEX_DEBUG === "icons";
  }

  /**
   * Register a CDN provider
   */
  registerProvider(
    providerName: string,
    config: CdnProviderConfig,
    mappings: Record<string, string>,
    options?: CdnProviderOptions,
  ): void {
    const provider = new BaseCdnProvider(config, mappings, options);
    this.providers.set(providerName, {
      provider,
      config,
      iconsUsed: new Set(),
    });

    // Initialize provider stats
    if (!this.stats.byProvider[providerName]) {
      this.stats.byProvider[providerName] = {
        requests: 0,
        cdnFetches: 0,
        failures: 0,
      };
    }
  }

  /**
   * Get an icon (main entry point)
   */
  async get(
    providerName: string,
    iconKey: string,
  ): Promise<SanitizedIcon | undefined> {
    this.stats.totalRequests++;
    this.stats.byProvider[providerName] = this.stats.byProvider[
      providerName
    ] || {
      requests: 0,
      cdnFetches: 0,
      failures: 0,
    };
    this.stats.byProvider[providerName].requests++;

    // Check if CDN is disabled
    if (process.env.ARCHLEX_DISABLE_CDN_ICONS === "true") {
      if (this.debug) {
        console.log(
          `[IconLoader] CDN disabled, skipping ${providerName}/${iconKey}`,
        );
      }
      return undefined;
    }

    const registered = this.providers.get(providerName);
    if (!registered) {
      if (this.debug) {
        console.log(`[IconLoader] Provider ${providerName} not registered`);
      }
      this.stats.failures++;
      this.stats.byProvider[providerName].failures++;
      return this.getFallbackIcon(providerName, iconKey);
    }

    // Try cache first
    const cached = await this.cache.get(providerName, iconKey);
    if (cached) {
      if (this.debug) {
        console.log(`[IconLoader] Cache HIT: ${providerName}/${iconKey}`);
      }
      this.stats.cacheHits++;
      registered.iconsUsed.add(iconKey);
      return cached;
    }

    if (this.debug) {
      console.log(`[IconLoader] Cache MISS: ${providerName}/${iconKey}`);
    }

    // Try CDN fetch
    try {
      const result = await registered.provider.fetchIcon(iconKey);

      if (!result) {
        if (this.debug) {
          console.log(
            `[IconLoader] CDN fetch failed for ${providerName}/${iconKey}`,
          );
        }
        this.stats.failures++;
        this.stats.byProvider[providerName].failures++;
        return this.getFallbackIcon(providerName, iconKey);
      }

      if (this.debug) {
        console.log(
          `[IconLoader] Fetching ${providerName}/${iconKey} from ${result.urlUsed}`,
        );
      }

      this.stats.cdnFetches++;
      this.stats.byProvider[providerName].cdnFetches++;

      // Sanitize
      const sanitized = sanitizeSvg(providerName, iconKey, result.rawSvg);

      // Cache it
      await this.cache.set(providerName, iconKey, sanitized, result.urlUsed);

      registered.iconsUsed.add(iconKey);
      return sanitized;
    } catch (error) {
      if (this.debug) {
        console.error(
          `[IconLoader] Error fetching ${providerName}/${iconKey}:`,
          error,
        );
      }
      this.stats.failures++;
      this.stats.byProvider[providerName].failures++;

      // Try expired cache as fallback
      const expiredCache = await this.cache.get(providerName, iconKey, {
        allowExpired: true,
      });
      if (expiredCache) {
        if (this.debug) {
          console.log(
            `[IconLoader] Using expired cache for ${providerName}/${iconKey}`,
          );
        }
        registered.iconsUsed.add(iconKey);
        return expiredCache;
      }

      return this.getFallbackIcon(providerName, iconKey);
    }
  }

  /**
   * Get fallback generic cloud icon
   */
  private getFallbackIcon(
    providerName: string,
    iconKey: string,
  ): SanitizedIcon {
    if (this.debug) {
      console.log(
        `[IconLoader] Using fallback icon for ${providerName}/${iconKey}`,
      );
    }

    return sanitizeSvg(providerName, iconKey, GENERIC_CLOUD_ICON_SVG);
  }

  /**
   * Get current statistics
   */
  getStats(): IconStats {
    return JSON.parse(JSON.stringify(this.stats));
  }

  /**
   * Get attribution reports for all providers with icons used
   */
  getAttributions(): ProviderAttributionReport[] {
    const reports: ProviderAttributionReport[] = [];

    for (const [providerName, registered] of this.providers.entries()) {
      if (registered.iconsUsed.size > 0) {
        reports.push({
          provider: providerName,
          source: registered.config.attribution.source,
          url: registered.config.attribution.url,
          iconsUsed: Array.from(registered.iconsUsed).sort(),
        });
      }
    }

    return reports;
  }

  /**
   * Reset the loader (for testing)
   */
  reset(): void {
    this.providers.clear();
    this.cache = new CacheManager();
    this.stats = {
      totalRequests: 0,
      bundledHits: 0,
      cacheHits: 0,
      cdnFetches: 0,
      failures: 0,
      byProvider: {},
    };
  }
}

// Singleton instance
export const IconLoader = new IconLoaderClass();
