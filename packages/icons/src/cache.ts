import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { IconCacheEntry, SanitizedIcon } from "./types.js";

export interface CacheManagerConfig {
  cacheDir?: string;
  ttlDays?: number;
}

export class CacheManager {
  private readonly cacheDir: string;
  private readonly ttlMs: number;

  constructor(config: CacheManagerConfig = {}) {
    // Resolve cache directory
    this.cacheDir =
      config.cacheDir ||
      process.env.ARCHLEX_ICON_CACHE_DIR ||
      join(homedir(), ".cache", "archlex", "icons");

    // Resolve TTL
    const envTtl = process.env.ARCHLEX_ICON_CACHE_TTL
      ? Number.parseInt(process.env.ARCHLEX_ICON_CACHE_TTL, 10)
      : undefined;
    const ttlDays = config.ttlDays ?? envTtl ?? 7;
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Get a cached icon entry
   */
  async get(
    provider: string,
    key: string,
    options: { allowExpired?: boolean } = {},
  ): Promise<SanitizedIcon | undefined> {
    const providerDir = join(this.cacheDir, provider);

    try {
      const files = await readdir(providerDir);
      const matchingFile = files.find((f) => f.startsWith(`${key}-`));

      if (!matchingFile) {
        return undefined;
      }

      const filePath = join(providerDir, matchingFile);
      const content = await readFile(filePath, "utf-8");
      const entry: IconCacheEntry = JSON.parse(content);

      // Check expiration
      const expiresAt = new Date(entry.expiresAt);
      const now = new Date();

      if (now > expiresAt && !options.allowExpired) {
        return undefined;
      }

      return {
        key: entry.key,
        provider: entry.provider,
        checksum: entry.checksum,
        viewBox: entry.viewBox,
        svgFragment: entry.svgFragment,
      };
    } catch (error) {
      // Directory or file doesn't exist
      return undefined;
    }
  }

  /**
   * Store an icon in the cache
   */
  async set(
    provider: string,
    key: string,
    icon: SanitizedIcon,
    cdnSource: string,
  ): Promise<void> {
    const providerDir = join(this.cacheDir, provider);
    await mkdir(providerDir, { recursive: true });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    const entry: IconCacheEntry = {
      key: icon.key,
      provider: icon.provider,
      checksum: icon.checksum,
      viewBox: icon.viewBox,
      svgFragment: icon.svgFragment,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      cdnSource,
    };

    const fileName = `${key}-${icon.checksum}.json`;
    const filePath = join(providerDir, fileName);
    const tmpPath = join(
      tmpdir(),
      `archlex-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
    );

    // Atomic write: write to temp file, then rename
    await writeFile(tmpPath, JSON.stringify(entry, null, 2), "utf-8");
    await rename(tmpPath, filePath);
  }

  /**
   * Purge expired cache entries
   */
  async purgeExpired(): Promise<number> {
    let purgedCount = 0;
    const now = new Date();

    try {
      const providers = await readdir(this.cacheDir);

      for (const provider of providers) {
        const providerDir = join(this.cacheDir, provider);
        const providerStat = await stat(providerDir);

        if (!providerStat.isDirectory()) {
          continue;
        }

        const files = await readdir(providerDir);

        for (const file of files) {
          const filePath = join(providerDir, file);

          try {
            const content = await readFile(filePath, "utf-8");
            const entry: IconCacheEntry = JSON.parse(content);
            const expiresAt = new Date(entry.expiresAt);

            if (now > expiresAt) {
              await rm(filePath, { force: true });
              purgedCount++;
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Cache directory doesn't exist or is empty
    }

    return purgedCount;
  }
}
