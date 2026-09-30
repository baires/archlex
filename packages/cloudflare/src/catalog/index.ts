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
  cache: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/cache.svg",
    sha256: "3098b4637dea88f0785cc62cbea678835ff5b24e92e909b4e9771e422b26e910",
  },
  "client-ip-geolocation": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/client-ip-geolocation.svg",
    sha256: "ff20f023abb88ea7e40dc00129efd9764b9079ecf2ea999d9bcd73770177d529",
  },
  "client-side-security": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/client-side-security.svg",
    sha256: "fb074e20826bd35444fb8db5439447a3a8a20ffcafefd900b3ad540cc16a2883",
  },
  "google-tag-gateway": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/google-tag-gateway.svg",
    sha256: "cc7d4f2b08540dbdf740f20f5a10dbcf3024f549a330829b318a9004c6ea77f6",
  },
  images: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/images.svg",
    sha256: "90efddac7d07512c9aa0c482cd206eef8329a7f9fb20669f47d5010a7dfdbce1",
  },
  moq: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/moq.svg",
    sha256: "fb2ddfadb4a117030878397481ff395f7e8e27b868acb56406dc35068f2065b9",
  },
  "realtime-kit": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/realtime-kit.svg",
    sha256: "cbe7bb6834c22644d3103eff28a18caebd5c306dece01d34c4d964d6434fdd78",
  },
  "realtime-sfu": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/realtime-sfu.svg",
    sha256: "cbe7bb6834c22644d3103eff28a18caebd5c306dece01d34c4d964d6434fdd78",
  },
  "realtime-turn": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/realtime-turn.svg",
    sha256: "cbe7bb6834c22644d3103eff28a18caebd5c306dece01d34c4d964d6434fdd78",
  },
  stream: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/stream.svg",
    sha256: "68d05d4b1a17e0ae666d4198a15405b886fb6f769d09a462e978af89de46788f",
  },
  zaraz: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/zaraz.svg",
    sha256: "cc7d4f2b08540dbdf740f20f5a10dbcf3024f549a330829b318a9004c6ea77f6",
  },
  flagship: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/flagship.svg",
    sha256: "491edad3b81d4c081f86dac86dd6985692e82549d9872aaa7d658f9e5df14c30",
  },
  registrar: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/registrar.svg",
    sha256: "5ab2fbc0ad74719090351333d273e2ad97e581587128a91d7911e65e9619fb3d",
  },
  rules: {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/rules.svg",
    sha256: "0a0d9b208c1b9104781728a644ab1a65a232a2733637d50577319f4751105618",
  },
  "ruleset-engine": {
    revision: "48f601bf4293fa9032505f858656d0db5b559131",
    sourcePath: "src/icons/ruleset-engine.svg",
    sha256: "9e74aec3285e171eee3e77dad9d5029be9df238961ffcf55e8f0664d643aabdf",
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
  {
    id: "cache",
    displayName: "Cache",
    category: "networking",
    aliases: ["cloudflare.cache", "cdn"],
    iconKey: "cloudflare.cache",
    allowedContainment: ["account"],
  },
  {
    id: "client-ip-geolocation",
    displayName: "Client Ip Geolocation",
    category: "networking",
    aliases: ["cloudflare.client-ip-geolocation"],
    iconKey: "cloudflare.client-ip-geolocation",
    allowedContainment: ["account"],
  },
  {
    id: "client-side-security",
    displayName: "Client-side Security",
    category: "networking",
    aliases: ["cloudflare.client-side-security"],
    iconKey: "cloudflare.client-side-security",
    allowedContainment: ["account"],
  },
  {
    id: "google-tag-gateway",
    displayName: "Google Tag Gateway",
    category: "networking",
    aliases: ["cloudflare.google-tag-gateway"],
    iconKey: "cloudflare.google-tag-gateway",
    allowedContainment: ["account"],
  },
  {
    id: "images",
    displayName: "Images",
    category: "networking",
    aliases: ["cloudflare.images"],
    iconKey: "cloudflare.images",
    allowedContainment: ["account"],
  },
  {
    id: "moq",
    displayName: "Media over QUIC",
    category: "networking",
    aliases: ["cloudflare.moq"],
    iconKey: "cloudflare.moq",
    allowedContainment: ["account"],
  },
  {
    id: "realtime-kit",
    displayName: "RealtimeKit",
    category: "networking",
    aliases: ["cloudflare.realtime-kit"],
    iconKey: "cloudflare.realtime-kit",
    allowedContainment: ["account"],
  },
  {
    id: "realtime-sfu",
    displayName: "Realtime SFU",
    category: "networking",
    aliases: ["cloudflare.realtime-sfu"],
    iconKey: "cloudflare.realtime-sfu",
    allowedContainment: ["account"],
  },
  {
    id: "realtime-turn",
    displayName: "Realtime TURN",
    category: "networking",
    aliases: ["cloudflare.realtime-turn"],
    iconKey: "cloudflare.realtime-turn",
    allowedContainment: ["account"],
  },
  {
    id: "stream",
    displayName: "Stream",
    category: "networking",
    aliases: ["cloudflare.stream"],
    iconKey: "cloudflare.stream",
    allowedContainment: ["account"],
  },
  {
    id: "zaraz",
    displayName: "Zaraz",
    category: "networking",
    aliases: ["cloudflare.zaraz"],
    iconKey: "cloudflare.zaraz",
    allowedContainment: ["account"],
  },
  {
    id: "flagship",
    displayName: "Flagship",
    category: "management",
    aliases: ["cloudflare.flagship"],
    iconKey: "cloudflare.flagship",
    allowedContainment: ["account"],
  },
  {
    id: "registrar",
    displayName: "Registrar",
    category: "management",
    aliases: ["cloudflare.registrar"],
    iconKey: "cloudflare.registrar",
    allowedContainment: ["account"],
  },
  {
    id: "rules",
    displayName: "Rules",
    category: "management",
    aliases: ["cloudflare.rules"],
    iconKey: "cloudflare.rules",
    allowedContainment: ["account"],
  },
  {
    id: "ruleset-engine",
    displayName: "Ruleset Engine",
    category: "management",
    aliases: ["cloudflare.ruleset-engine"],
    iconKey: "cloudflare.ruleset-engine",
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
