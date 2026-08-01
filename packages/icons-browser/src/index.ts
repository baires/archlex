import {
  type CdnProviderDefinition,
  type FetchIcon,
  type IconLoader,
  createIconLoader,
} from "@archlex/icons-core";
import { MemoryIconCache } from "./memory-cache.js";

export * from "@archlex/icons-core";
export { MemoryIconCache } from "./memory-cache.js";

export interface CreateBrowserIconLoaderOptions {
  readonly providers: readonly CdnProviderDefinition[];
  readonly fetchFn?: FetchIcon;
  readonly concurrency?: number;
  readonly negativeCacheMs?: number;
}

export function createBrowserIconLoader(
  options: CreateBrowserIconLoaderOptions,
): IconLoader {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  return createIconLoader({
    providers: options.providers,
    fetchFn,
    cache: new MemoryIconCache(),
    concurrency: options.concurrency,
    negativeCacheMs: options.negativeCacheMs,
  });
}
