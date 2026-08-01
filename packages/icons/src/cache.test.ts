import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CacheManager } from "./cache.js";
import type { SanitizedIcon } from "./types.js";

describe("CacheManager", () => {
  let testCacheDir: string;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    testCacheDir = join(
      tmpdir(),
      `archlex-test-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testCacheDir, { recursive: true });
    cacheManager = new CacheManager({ cacheDir: testCacheDir, ttlDays: 7 });
  });

  afterEach(async () => {
    await rm(testCacheDir, { recursive: true, force: true });
  });

  it("stores and retrieves a cached icon entry", async () => {
    const icon: SanitizedIcon = {
      key: "lambda",
      provider: "aws",
      checksum: "abc123def456",
      viewBox: "0 0 64 64",
      svgFragment: "<svg>...</svg>",
    };

    await cacheManager.set(
      "aws",
      "lambda",
      icon,
      "https://unpkg.com/aws-icons@latest/icons/lambda.svg",
    );
    const retrieved = await cacheManager.get("aws", "lambda");
    expect(retrieved).toBeDefined();
    expect(retrieved?.svgFragment).toBe("<svg>...</svg>");
    expect(retrieved?.checksum).toBe("abc123def456");
  });

  it("returns expired entry when allowExpired is true", async () => {
    const shortTtlManager = new CacheManager({
      cacheDir: testCacheDir,
      ttlDays: -1,
    });
    const icon: SanitizedIcon = {
      key: "s3",
      provider: "aws",
      checksum: "789ghi",
      viewBox: "0 0 64 64",
      svgFragment: "<svg>s3</svg>",
    };

    await shortTtlManager.set(
      "aws",
      "s3",
      icon,
      "https://unpkg.com/aws-icons/s3.svg",
    );

    const freshOnly = await shortTtlManager.get("aws", "s3", {
      allowExpired: false,
    });
    expect(freshOnly).toBeUndefined();

    const expiredAllowed = await shortTtlManager.get("aws", "s3", {
      allowExpired: true,
    });
    expect(expiredAllowed?.svgFragment).toBe("<svg>s3</svg>");
  });

  it("cleans up expired entries during purgeExpired()", async () => {
    const shortTtlManager = new CacheManager({
      cacheDir: testCacheDir,
      ttlDays: -1,
    });
    const icon: SanitizedIcon = {
      key: "sqs",
      provider: "aws",
      checksum: "sqs123",
      viewBox: "0 0 64 64",
      svgFragment: "<svg>sqs</svg>",
    };

    await shortTtlManager.set(
      "aws",
      "sqs",
      icon,
      "https://unpkg.com/aws-icons/sqs.svg",
    );
    await shortTtlManager.purgeExpired();
    const result = await shortTtlManager.get("aws", "sqs", {
      allowExpired: true,
    });
    expect(result).toBeUndefined();
  });
});
