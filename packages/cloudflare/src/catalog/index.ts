import type { ResourceDefinition } from "@archlex/model";

export const CLOUDFLARE_CATALOG_VERSION = "2026-09-29-workers";

export const WORKERS_ARTWORK_PIN = {
  revision: "48f601bf4293fa9032505f858656d0db5b559131",
  sourcePath: "src/icons/workers.svg",
  sha256: "c7f249bbc68c02c2fdaa590c18378c0debde017e80772437ac474a9a508197a8",
} as const;

export const initialServices: readonly ResourceDefinition[] = [
  {
    id: "workers",
    displayName: "Workers",
    category: "compute",
    aliases: ["cloudflare.workers"],
    iconKey: "cloudflare.workers",
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
