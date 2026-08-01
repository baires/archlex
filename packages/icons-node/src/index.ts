import {
  type CdnProviderDefinition,
  type FetchIcon,
  type IconLoader,
  createIconLoader,
} from "@archlex/icons-core";
import { CacheManager } from "./cache.js";

export * from "@archlex/icons-core";
export * from "./cache.js";

export interface CreateNodeIconLoaderOptions {
  readonly providers: readonly CdnProviderDefinition[];
  readonly fetchFn?: FetchIcon;
  readonly cacheDir?: string;
  readonly ttlDays?: number;
}

/** @internal Used only by the deprecated `@archlex/icons` Node facade. */
export function legacyCdnIconsDisabled(): boolean {
  return process.env.ARCHLEX_DISABLE_CDN_ICONS === "true";
}

export function createNodeIconLoader(
  options: CreateNodeIconLoaderOptions,
): IconLoader {
  const suppliedFetch = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  const cdnDisabled = legacyCdnIconsDisabled();
  const debug = process.env.ARCHLEX_DEBUG === "icons";
  const fetchFn: FetchIcon = cdnDisabled
    ? async (input) => {
        if (debug) console.debug(`[IconLoader] CDN disabled: ${String(input)}`);
        return new Response(null, { status: 404 });
      }
    : async (input, init) => {
        if (debug) console.debug(`[IconLoader] Fetching ${String(input)}`);
        return suppliedFetch(input, init);
      };

  return createIconLoader({
    providers: options.providers,
    fetchFn,
    cache: new CacheManager({
      cacheDir: options.cacheDir,
      ttlDays: options.ttlDays,
    }),
  });
}
