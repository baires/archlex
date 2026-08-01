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
import { sanitizeSvg } from "@archlex/icons-core";

const DEFAULT_TTL_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;
const SHA_256_HEX = /^[a-f0-9]{64}$/;

export interface CacheManagerConfig {
  readonly cacheDir?: string;
  readonly ttlDays?: number;
}

interface CacheReadOptions {
  readonly allowExpired?: boolean;
}

export interface IconCacheEntry extends SanitizedIcon {
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
    const ttlDays = resolveTtlDays(
      config.ttlDays,
      process.env.ARCHLEX_ICON_CACHE_TTL,
    );
    this.ttlMs = ttlDays * MILLISECONDS_PER_DAY;
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
      const fresh: ValidatedCacheEntry[] = [];
      const expired: ValidatedCacheEntry[] = [];
      const now = Date.now();
      for (const file of files) {
        if (!cacheFilePattern.test(file)) continue;
        const entry = await readValidatedEntry(
          join(providerDirectory, file),
          file,
          request,
        );
        if (!entry) continue;
        (now > entry.expiresAtMs ? expired : fresh).push(entry);
      }
      const byNewestCacheTime = (
        left: ValidatedCacheEntry,
        right: ValidatedCacheEntry,
      ) => right.cachedAtMs - left.cachedAtMs;
      fresh.sort(byNewestCacheTime);
      expired.sort(byNewestCacheTime);
      return (
        fresh[0]?.icon ?? (options.allowExpired ? expired[0]?.icon : undefined)
      );
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

    try {
      await writeFile(temporaryPath, JSON.stringify(entry, null, 2), "utf8");
      await rename(temporaryPath, filePath);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
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

interface ValidatedCacheEntry {
  readonly icon: SanitizedIcon;
  readonly cachedAtMs: number;
  readonly expiresAtMs: number;
}

async function readValidatedEntry(
  filePath: string,
  fileName: string,
  request: IconRequest,
): Promise<ValidatedCacheEntry | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (!isCacheEntry(parsed)) return undefined;
    const entry = parsed;
    const filenameChecksum = fileName.slice(
      `${request.key}-`.length,
      -".json".length,
    );
    if (
      entry.provider !== request.provider ||
      entry.key !== request.key ||
      filenameChecksum !== entry.checksum
    ) {
      return undefined;
    }

    const cachedAtMs = parseIsoTimestamp(entry.cachedAt);
    const expiresAtMs = parseIsoTimestamp(entry.expiresAt);
    if (
      cachedAtMs === undefined ||
      expiresAtMs === undefined ||
      expiresAtMs < cachedAtMs
    ) {
      return undefined;
    }

    const sanitized = await sanitizeSvg(
      entry.provider,
      entry.key,
      entry.svgFragment,
    );
    if (
      sanitized.checksum !== entry.checksum ||
      sanitized.viewBox !== entry.viewBox ||
      sanitized.svgFragment !== entry.svgFragment
    ) {
      return undefined;
    }
    return { icon: toSanitizedIcon(entry), cachedAtMs, expiresAtMs };
  } catch {
    return undefined;
  }
}

function isCacheEntry(value: unknown): value is IconCacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.key === "string" &&
    entry.key.length > 0 &&
    typeof entry.provider === "string" &&
    entry.provider.length > 0 &&
    typeof entry.checksum === "string" &&
    SHA_256_HEX.test(entry.checksum) &&
    typeof entry.viewBox === "string" &&
    entry.viewBox.length > 0 &&
    typeof entry.svgFragment === "string" &&
    entry.svgFragment.length > 0 &&
    typeof entry.cachedAt === "string" &&
    typeof entry.expiresAt === "string" &&
    typeof entry.cdnSource === "string"
  );
}

function parseIsoTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString() === value ? timestamp : undefined;
}

function resolveTtlDays(
  configuredTtl: number | undefined,
  environmentTtl: string | undefined,
): number {
  if (configuredTtl !== undefined) {
    return isValidTtl(configuredTtl) ? configuredTtl : DEFAULT_TTL_DAYS;
  }
  if (environmentTtl !== undefined) {
    if (environmentTtl.trim().length === 0) return DEFAULT_TTL_DAYS;
    const parsed = Number(environmentTtl);
    return isValidTtl(parsed) ? parsed : DEFAULT_TTL_DAYS;
  }
  return DEFAULT_TTL_DAYS;
}

function isValidTtl(value: number): boolean {
  const ttlMs = value * MILLISECONDS_PER_DAY;
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isFinite(ttlMs) &&
    ttlMs <= MAX_DATE_TIMESTAMP - Date.now()
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
