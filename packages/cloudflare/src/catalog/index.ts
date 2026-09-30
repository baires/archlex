import type { ResourceDefinition } from "@archlex/model";

export const CLOUDFLARE_CATALOG_VERSION = "2026-09-30";

export const WORKERS_ARTWORK_PIN = {
  revision: "48f601bf4293fa9032505f858656d0db5b559131",
  sourcePath: "src/icons/workers.svg",
  sha256: "c7f249bbc68c02c2fdaa590c18378c0debde017e80772437ac474a9a508197a8",
} as const;

export interface ArtworkPin {
  readonly revision: string;
  readonly sourcePath: string;
  readonly sha256: string;
}

export const CLOUDFLARE_ARTWORK_PINS: Readonly<Record<string, ArtworkPin>> = {
  workers: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/workers.svg",
    sha256: "c7f249bbc68c02c2fdaa590c18378c0debde017e80772437ac474a9a508197a8",
  },
  "ai-gateway": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/ai-gateway.svg",
    sha256: "b70925f5134efb4a35ae387c2b7c60f93edcfc598ad53816c1b070d516994459",
  },
  "ai-search": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/ai-search.svg",
    sha256: "8d51b51581f7346f76a73584816e8ee2e3eb3b222519e5ed49c0de15f9c79cdc",
  },
  "workers-ai": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/workers-ai.svg",
    sha256: "0c4ce98f190e00a8ab7bd25fa3e420114e983840c55dbcec640e3f36a1f03cd6",
  },
  agents: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/agents.svg",
    sha256: "b70925f5134efb4a35ae387c2b7c60f93edcfc598ad53816c1b070d516994459",
  },
};

export const initialServices: readonly ResourceDefinition[] = [
  {
    id: "workers",
    displayName: "Workers",
    category: "compute",
    aliases: ["cloudflare.workers"],
    iconKey: "cloudflare.workers",
    allowedContainment: ["account"],
  },
  {
    id: "ai-gateway",
    displayName: "AI Gateway",
    category: "ai-ml",
    aliases: ["cloudflare.ai-gateway"],
    iconKey: "cloudflare.ai-gateway",
    allowedContainment: ["account"],
  },
  {
    id: "ai-search",
    displayName: "AI Search",
    category: "ai-ml",
    aliases: ["cloudflare.ai-search"],
    iconKey: "cloudflare.ai-search",
    allowedContainment: ["account"],
  },
  {
    id: "workers-ai",
    displayName: "Workers AI",
    category: "ai-ml",
    aliases: ["cloudflare.workers-ai"],
    iconKey: "cloudflare.workers-ai",
    allowedContainment: ["account"],
  },
  {
    id: "agents",
    displayName: "Agents",
    category: "compute",
    aliases: ["cloudflare.agents"],
    iconKey: "cloudflare.agents",
    allowedContainment: ["account"],
  },
];

const catalog = new Map<string, ResourceDefinition>();
const aliases = new Map<string, string>();

for (const service of initialServices) {
  catalog.set(service.id, service);
  aliases.set(service.id, service.id);
  for (const alias of service.aliases) {
    aliases.set(alias.toLowerCase(), service.id);
  }
}

export function resolveCloudflareService(
  kindOrAlias: string,
): ResourceDefinition | undefined {
  const canonicalId = aliases.get(kindOrAlias.toLowerCase());
  return canonicalId ? catalog.get(canonicalId) : undefined;
}
