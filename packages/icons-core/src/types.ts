export interface IconRequest {
  readonly provider: string;
  readonly key: string;
}

export interface SanitizedIcon {
  readonly key: string;
  readonly provider: string;
  readonly checksum: string;
  readonly viewBox: string;
  readonly svgFragment: string;
}

export type IconRegistry = ReadonlyMap<string, SanitizedIcon>;

export interface IconDiagnostic {
  readonly provider: string;
  readonly key: string;
  readonly code:
    | "ICON_FETCH_FAILED"
    | "ICON_INVALID"
    | "ICON_TOO_LARGE"
    | "ICON_UNMAPPED";
  readonly message: string;
}

export interface IconCache {
  get(
    request: IconRequest,
    options?: { allowExpired?: boolean },
  ): Promise<SanitizedIcon | undefined>;
  set(request: IconRequest, icon: SanitizedIcon, source: string): Promise<void>;
}

export type FetchIcon = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface CdnAttribution {
  readonly source: string;
  readonly license: string;
  readonly url: string;
}

export interface CdnProviderDefinition {
  readonly provider: string;
  readonly baseUrl: string;
  readonly allowedHosts: readonly string[];
  readonly releaseId: string;
  readonly fileExtension: string;
  readonly mappings: Readonly<Record<string, string>>;
  readonly integrity?: Readonly<Record<string, string>>;
  readonly attribution: CdnAttribution;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
}

export interface CdnProviderFetchResult {
  readonly rawSvg: string;
  readonly source: string;
}

export interface CdnProvider {
  readonly definition: CdnProviderDefinition;
  fetchIcon(
    key: string,
    options?: { signal?: AbortSignal },
  ): Promise<CdnProviderFetchResult | undefined>;
}

export interface IconLoadResult {
  readonly icons: ReadonlyMap<string, SanitizedIcon>;
  readonly diagnostics: readonly IconDiagnostic[];
}

export interface IconLoader {
  loadIcons(
    requests: readonly IconRequest[],
    options?: { signal?: AbortSignal },
  ): Promise<IconLoadResult>;
}

export interface CreateIconLoaderOptions {
  readonly providers: readonly CdnProviderDefinition[];
  readonly fetchFn: FetchIcon;
  readonly cache?: IconCache;
  readonly concurrency?: number;
  readonly negativeCacheMs?: number;
}
