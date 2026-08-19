import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import type { CatalogResourceMetadata } from "@archlex/model";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
  defaultProvider: "aws",
});

export interface GetCatalogArgs {
  provider?: "aws" | "gcp" | "k8s" | "all";
  query?: string;
  category?: string;
  limit?: number;
}

interface CatalogMatch extends CatalogResourceMetadata {
  provider: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(
  service: CatalogResourceMetadata,
  query: string,
): boolean {
  const searchable = [
    service.id,
    service.displayName,
    service.category,
    ...service.aliases,
    ...(service.searchTerms ?? []),
  ];
  return searchable.some((value) => normalize(value).includes(query));
}

export async function handleGetCatalog(args: GetCatalogArgs = {}) {
  const { provider = "all", query, category } = args;

  const catalog = archlex.getCatalog(provider);

  const normalizedQuery = query ? normalize(query) : "";
  const normalizedCategory = category ? normalize(category) : "";
  if (normalizedQuery || normalizedCategory) {
    const requestedLimit = Number.isFinite(args.limit)
      ? Math.trunc(args.limit ?? DEFAULT_LIMIT)
      : DEFAULT_LIMIT;
    const limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
    const matches: CatalogMatch[] = [];

    for (const providerCatalog of Object.values(catalog.providers)) {
      for (const service of providerCatalog.services) {
        if (
          normalizedCategory &&
          normalize(service.category) !== normalizedCategory
        ) {
          continue;
        }
        if (normalizedQuery && !matchesQuery(service, normalizedQuery)) {
          continue;
        }
        matches.push({ provider: providerCatalog.id, ...service });
        if (matches.length >= limit) break;
      }
      if (matches.length >= limit) break;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              provider,
              query: query?.trim(),
              category: category?.trim(),
              count: matches.length,
              matches,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(catalog, null, 2),
      },
    ],
  };
}
