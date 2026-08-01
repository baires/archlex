import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  IconCache,
  IconRequest,
  SanitizedIcon,
} from "@archlex/icons-core";

export interface CacheManagerConfig {
  readonly cacheDir?: string;
  readonly ttlDays?: number;
}

interface CacheReadOptions {
  readonly allowExpired?: boolean;
}

interface IconCacheEntry extends SanitizedIcon {
  readonly cachedAt: string;
  readonly expiresAt: string;
  readonly cdnSource: string;
}

export class CacheManager implements IconCache {
  private readonly cacheDir: string;
  private readonly ttlMs: number;

  constructor(config: CacheManagerConfig = {}) {
    this.cacheDir =
      config.cacheDir ??
      process.env.ARCHLEX_ICON_CACHE_DIR ??
      join(homedir(), ".cache", "archlex", "icons");
    const environmentTtl = process.env.ARCHLEX_ICON_CACHE_TTL
      ? Number.parseInt(process.env.ARCHLEX_ICON_CACHE_TTL, 10)
      : undefined;
    const ttlDays = config.ttlDays ?? environmentTtl ?? 7;
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1_000;
  }

  async get(
    request: IconRequest,
    options?: CacheReadOptions,
  ): Promise<SanitizedIcon | undefined>;
  async get(
    provider: string,
    key: string,
    options?: CacheReadOptions,
  ): Promise<SanitizedIcon | undefined>;
  async get(
    requestOrProvider: IconRequest | string,
    keyOrOptions: string | CacheReadOptions = {},
    legacyOptions: CacheReadOptions = {},
  ): Promise<SanitizedIcon | undefined> {
    const request =
      typeof requestOrProvider === "string"
        ? { provider: requestOrProvider, key: String(keyOrOptions) }
        : requestOrProvider;
    const options =
      typeof requestOrProvider === "string"
        ? legacyOptions
        : (keyOrOptions as CacheReadOptions);
    const providerDirectory = join(this.cacheDir, request.provider);

    try {
      const files = await readdir(providerDirectory);
      const cacheFilePattern = new RegExp(
        `^${escapeRegExp(request.key)}-[a-f0-9]{64}\\.json$`,
        "i",
      );
      for (const file of files) {
        if (!cacheFilePattern.test(file)) continue;
        const entry: IconCacheEntry = JSON.parse(
          await readFile(join(providerDirectory, file), "utf8"),
        );
        if (entry.provider !== request.provider || entry.key !== request.key) {
          continue;
        }
        if (
          Date.now() > new Date(entry.expiresAt).getTime() &&
          !options.allowExpired
        ) {
          return undefined;
        }
        return toSanitizedIcon(entry);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async set(
    request: IconRequest,
    icon: SanitizedIcon,
    source: string,
  ): Promise<void>;
  async set(
    provider: string,
    key: string,
    icon: SanitizedIcon,
    source: string,
  ): Promise<void>;
  async set(
    requestOrProvider: IconRequest | string,
    iconOrKey: SanitizedIcon | string,
    sourceOrIcon: string | SanitizedIcon,
    legacySource?: string,
  ): Promise<void> {
    const request =
      typeof requestOrProvider === "string"
        ? { provider: requestOrProvider, key: iconOrKey as string }
        : requestOrProvider;
    const icon =
      typeof requestOrProvider === "string"
        ? (sourceOrIcon as SanitizedIcon)
        : (iconOrKey as SanitizedIcon);
    const source =
      typeof requestOrProvider === "string"
        ? (legacySource as string)
        : (sourceOrIcon as string);
    const providerDirectory = join(this.cacheDir, request.provider);
    await mkdir(providerDirectory, { recursive: true });

    const now = new Date();
    const entry: IconCacheEntry = {
      ...icon,
      cachedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlMs).toISOString(),
      cdnSource: source,
    };
    const fileName = `${request.key}-${icon.checksum}.json`;
    const filePath = join(providerDirectory, fileName);
    const temporaryPath = join(
      providerDirectory,
      `.${fileName}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
    );

    await writeFile(temporaryPath, JSON.stringify(entry, null, 2), "utf8");
    await rename(temporaryPath, filePath);
  }

  async purgeExpired(): Promise<number> {
    let purgedCount = 0;

    try {
      for (const provider of await readdir(this.cacheDir)) {
        const providerDirectory = join(this.cacheDir, provider);
        if (!(await stat(providerDirectory)).isDirectory()) continue;

        for (const file of await readdir(providerDirectory)) {
          const filePath = join(providerDirectory, file);
          try {
            const entry: IconCacheEntry = JSON.parse(
              await readFile(filePath, "utf8"),
            );
            if (Date.now() > new Date(entry.expiresAt).getTime()) {
              await rm(filePath, { force: true });
              purgedCount += 1;
            }
          } catch {
            // Ignore invalid cache records while purging valid expired records.
          }
        }
      }
    } catch {
      // A missing or empty cache has no expired records.
    }

    return purgedCount;
  }
}

function toSanitizedIcon(entry: IconCacheEntry): SanitizedIcon {
  return {
    key: entry.key,
    provider: entry.provider,
    checksum: entry.checksum,
    viewBox: entry.viewBox,
    svgFragment: entry.svgFragment,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
