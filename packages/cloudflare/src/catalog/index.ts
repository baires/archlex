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
  "browser-run": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/browser-run.svg",
    sha256: "e3e8f301b54cf9dec0a29c1a38adefcc4bb335c78d3aa2fa44154b1f06d4f5f6",
  },
  containers: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/containers.svg",
    sha256: "2eb0c0906849b151acd1563d57b4989bf322c3a78f836b7e9b714b336c267068",
  },
  "dynamic-workers": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/dynamic-workers.svg",
    sha256: "57fb8f0aa029c36f2ea3cfbbc189abb783ee514595afdc0885eb945523e51531",
  },
  pages: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/pages.svg",
    sha256: "cbbf879380cbccce8570b4f7720098d6d214f5b2d77aad2ca5e7301a941791e7",
  },
  sandbox: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/sandbox.svg",
    sha256: "2eb0c0906849b151acd1563d57b4989bf322c3a78f836b7e9b714b336c267068",
  },
  workflows: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/workflows.svg",
    sha256: "c7f249bbc68c02c2fdaa590c18378c0debde017e80772437ac474a9a508197a8",
  },
  "automatic-platform-optimization": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/automatic-platform-optimization.svg",
    sha256: "bee0368c79f9acfce94629f2b0de162b7d9ed14a2b2124a2ae9595f6bbff9b4a",
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
  {
    id: "browser-run",
    displayName: "Browser Run",
    category: "compute",
    aliases: ["cloudflare.browser-run"],
    iconKey: "cloudflare.browser-run",
    allowedContainment: ["account"],
  },
  {
    id: "containers",
    displayName: "Containers",
    category: "compute",
    aliases: ["cloudflare.containers"],
    iconKey: "cloudflare.containers",
    allowedContainment: ["account"],
  },
  {
    id: "dynamic-workers",
    displayName: "Dynamic Workers",
    category: "compute",
    aliases: ["cloudflare.dynamic-workers"],
    iconKey: "cloudflare.dynamic-workers",
    allowedContainment: ["account"],
  },
  {
    id: "pages",
    displayName: "Pages",
    category: "compute",
    aliases: ["cloudflare.pages"],
    iconKey: "cloudflare.pages",
    allowedContainment: ["account"],
  },
  {
    id: "sandbox",
    displayName: "Sandbox",
    category: "compute",
    aliases: ["cloudflare.sandbox"],
    iconKey: "cloudflare.sandbox",
    allowedContainment: ["account"],
  },
  {
    id: "workflows",
    displayName: "Workflows",
    category: "compute",
    aliases: ["cloudflare.workflows"],
    iconKey: "cloudflare.workflows",
    allowedContainment: ["account"],
  },
  {
    id: "automatic-platform-optimization",
    displayName: "Automatic Platform Optimization",
    category: "networking",
    aliases: ["cloudflare.automatic-platform-optimization"],
    iconKey: "cloudflare.automatic-platform-optimization",
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
