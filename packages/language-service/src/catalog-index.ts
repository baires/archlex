import type {
  CatalogMetadata,
  RelationshipDefinition,
  ResourceDefinition,
} from "@archlex/model";

export interface CatalogIndex {
  resolveResource(
    providerId: string,
    idOrAlias: string,
  ): ResourceDefinition | undefined;
  searchResources(
    providerId: string,
    query: string,
  ): readonly ResourceDefinition[];
  listResources(providerId: string): readonly ResourceDefinition[];
  getSupportedScopes(providerId: string): readonly string[];
  getRelationships(providerId: string): readonly RelationshipDefinition[];
  getAllProviderIds(): readonly string[];
  getContainmentScopes(): readonly string[];
}

interface ProviderIndex {
  services: readonly ResourceDefinition[];
  aliasMap: Map<string, string>; // alias -> canonical id
  searchIndex: Map<string, Set<string>>; // normalized term -> set of service ids
  supportedScopes: readonly string[];
  relationships: readonly RelationshipDefinition[];
}

/**
 * Create a fast catalog index for completion and resolution.
 *
 * Builds maps for:
 * - Alias resolution (O(1) lookup)
 * - Search term matching (normalized, case-insensitive)
 * - Provider scope and relationship metadata
 */
export function createCatalogIndex(catalog: CatalogMetadata): CatalogIndex {
  const providers = new Map<string, ProviderIndex>();

  // Build index for each provider
  for (const [providerId, providerMeta] of Object.entries(catalog.providers)) {
    const aliasMap = new Map<string, string>();
    const searchIndex = new Map<string, Set<string>>();

    for (const service of providerMeta.services) {
      // Map canonical ID (normalized)
      const normalizedId = service.id.toLowerCase();
      aliasMap.set(normalizedId, service.id);

      // Map aliases
      for (const alias of service.aliases ?? []) {
        aliasMap.set(alias.toLowerCase(), service.id);
      }

      // Index search terms
      const terms = [service.displayName, ...(service.searchTerms ?? [])];

      for (const term of terms) {
        const normalized = normalizeTerm(term);
        const words = normalized.split(/\s+/);

        for (const word of words) {
          if (word.length > 0) {
            if (!searchIndex.has(word)) {
              searchIndex.set(word, new Set());
            }
            const wordSet = searchIndex.get(word);
            if (wordSet) {
              wordSet.add(service.id);
            }
          }
        }
      }
    }

    providers.set(providerId, {
      services: providerMeta.services,
      aliasMap,
      searchIndex,
      supportedScopes: providerMeta.supportedScopes ?? [],
      relationships: providerMeta.relationships ?? [],
    });
  }

  return {
    resolveResource(
      providerId: string,
      idOrAlias: string,
    ): ResourceDefinition | undefined {
      const provider = providers.get(providerId);
      if (!provider) return undefined;

      const canonicalId = provider.aliasMap.get(idOrAlias.toLowerCase());
      if (!canonicalId) return undefined;

      return provider.services.find((s) => s.id === canonicalId);
    },

    searchResources(
      providerId: string,
      query: string,
    ): readonly ResourceDefinition[] {
      const provider = providers.get(providerId);
      if (!provider) return [];

      const normalized = normalizeTerm(query);
      const words = normalized.split(/\s+/).filter((w) => w.length > 0);

      if (words.length === 0) return [];

      // Find services that match all words
      const matchingSets = words.map(
        (word) => provider.searchIndex.get(word) ?? new Set<string>(),
      );
      const matchingIds = intersection(...matchingSets);

      return provider.services.filter((s) => matchingIds.has(s.id));
    },

    listResources(providerId: string): readonly ResourceDefinition[] {
      const provider = providers.get(providerId);
      return provider?.services ?? [];
    },

    getSupportedScopes(providerId: string): readonly string[] {
      const provider = providers.get(providerId);
      return provider?.supportedScopes ?? [];
    },

    getRelationships(providerId: string): readonly RelationshipDefinition[] {
      const provider = providers.get(providerId);
      return provider?.relationships ?? [];
    },

    getAllProviderIds(): readonly string[] {
      return Array.from(providers.keys());
    },

    getContainmentScopes(): readonly string[] {
      return catalog.containmentScopes;
    },
  };
}

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

function intersection<T>(...sets: Set<T>[]): Set<T> {
  if (sets.length === 0) return new Set();
  if (sets.length === 1) return sets[0];

  const result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    for (const item of result) {
      if (!sets[i].has(item)) {
        result.delete(item);
      }
    }
  }
  return result;
}
