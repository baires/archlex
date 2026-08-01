import type { CdnProviderConfig } from "./types.js";

export interface CdnProviderOptions {
  fetchFn?: typeof fetch;
}

export class BaseCdnProvider {
  private readonly config: CdnProviderConfig;
  private readonly mappings: Record<string, string>;
  private readonly fetchFn: typeof fetch;

  constructor(
    config: CdnProviderConfig,
    mappings: Record<string, string>,
    options: CdnProviderOptions = {},
  ) {
    this.config = config;
    this.mappings = mappings;
    this.fetchFn = options.fetchFn || fetch;
  }

  /**
   * Fetch an icon from the CDN with fallback name transformations
   */
  async fetchIcon(
    iconKey: string,
  ): Promise<
    { rawSvg: string; nameUsed: string; urlUsed: string } | undefined
  > {
    // Generate candidate names
    const candidates = this.generateCandidateNames(iconKey);

    // Try each candidate
    for (const candidateName of candidates) {
      const url = `${this.config.baseUrl}/${candidateName}${this.config.fileExtension}`;

      try {
        const response = await this.fetchFn(url);

        if (response.ok) {
          const rawSvg = await response.text();
          return {
            rawSvg,
            nameUsed: candidateName,
            urlUsed: url,
          };
        }
      } catch {
        // Network error, try next candidate
      }
    }

    return undefined;
  }

  /**
   * Generate candidate names for an icon key with fallback transformations
   */
  private generateCandidateNames(iconKey: string): string[] {
    const candidates: string[] = [];

    // 1. Try explicit mapping first
    if (this.mappings[iconKey]) {
      candidates.push(this.mappings[iconKey]);
    } else {
      candidates.push(iconKey);
    }

    // 2. PascalCase transformation
    const pascalCase = this.toPascalCase(iconKey);
    if (!candidates.includes(pascalCase)) {
      candidates.push(pascalCase);
    }

    // 3. camelCase transformation
    const camelCase = this.toCamelCase(iconKey);
    if (!candidates.includes(camelCase)) {
      candidates.push(camelCase);
    }

    // 4. lowercase no-dashes
    const lowercaseNoDashes = iconKey.toLowerCase().replace(/-/g, "");
    if (!candidates.includes(lowercaseNoDashes)) {
      candidates.push(lowercaseNoDashes);
    }

    return candidates;
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  /**
   * Convert kebab-case to camelCase
   */
  private toCamelCase(str: string): string {
    const parts = str.split("-");
    if (parts.length === 1) {
      return str.toLowerCase();
    }

    return (
      parts[0].toLowerCase() +
      parts
        .slice(1)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join("")
    );
  }

  /**
   * Get provider configuration
   */
  getConfig(): CdnProviderConfig {
    return this.config;
  }
}
