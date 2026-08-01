export interface SanitizedIcon {
  readonly key: string;
  readonly provider: string;
  readonly checksum: string;
  readonly viewBox: string;
  readonly svgFragment: string;
}

export interface CdnAttribution {
  readonly source: string;
  readonly license: string;
  readonly url: string;
}

export interface CdnProviderConfig {
  readonly provider: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly fileExtension: string;
  readonly attribution: CdnAttribution;
}

export interface IconCacheEntry {
  readonly key: string;
  readonly provider: string;
  readonly checksum: string;
  readonly viewBox: string;
  readonly svgFragment: string;
  readonly cachedAt: string;
  readonly expiresAt: string;
  readonly cdnSource: string;
}

export interface IconStats {
  readonly totalRequests: number;
  readonly bundledHits: number;
  readonly cacheHits: number;
  readonly cdnFetches: number;
  readonly failures: number;
  readonly byProvider: Record<
    string,
    {
      readonly requests: number;
      readonly cdnFetches: number;
      readonly failures: number;
    }
  >;
}

export interface ProviderAttributionReport {
  readonly provider: string;
  readonly source: string;
  readonly url: string;
  readonly iconsUsed: readonly string[];
}
