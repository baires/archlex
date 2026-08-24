import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sanitizeGcpSvg } from "./import-official-icons.mjs";

const rootDir = fileURLToPath(new URL("../../..", import.meta.url));
const officialDir = fileURLToPath(
  new URL("../assets/official", import.meta.url),
);
const catalogPath = fileURLToPath(
  new URL("../src/catalog/index.ts", import.meta.url),
);

const LEGACY_ZIP = join(rootDir, "google-cloud-legacy-icons.zip");
const CATEGORY_ZIP = join(rootDir, "category-icons.zip");

const CATEGORY_FALLBACKS = {
  networking: "Networking-512-color-rgb.svg",
  compute: "Compute-512-color.svg",
  database: "Databases-512-color.svg",
  storage: "Storage-512-color.svg",
  messaging: "IntegrationServices-512-color.svg",
  analytics: "DataAnalytics-512-color.svg",
  "ai-ml": "AIMachineLearning-512-color.svg",
  identity: "SecurityIdentity-512-color.svg",
  security: "SecurityIdentity-512-color.svg",
  monitoring: "Observability-512-color.svg",
  integration: "IntegrationServices-512-color.svg",
  devtools: "Developer_Tools-512-color.svg",
  containers: "Containers-512-color.svg",
  management: "ManagementTools-512-color.svg",
};

export const EXTRA_ALIASES = {
  gke: ["google_kubernetes_engine", "google-kubernetes-engine"],
  "gke-autopilot": ["google_kubernetes_engine"],
  "gke-enterprise": ["google_kubernetes_engine", "gke_on-prem"],
  iap: ["identity-aware_proxy", "identity-aware-proxy"],
  "cloud-kms": ["key_management_service", "key-management-service"],
  dlp: ["data_loss_prevention_api", "data-loss-prevention-api"],
  "sensitive-data-protection": [
    "data_loss_prevention_api",
    "data-loss-prevention-api",
  ],
  "vertex-ai": ["vertexai"],
  "cloud-debugger": ["debugger"],
  operations: ["cloud_ops", "cloud-ops"],
  "transfer-service": ["transfer"],
  "database-migration": ["database_migration_service"],
  "migrate-compute-engine": ["migrate_for_compute_engine"],
  "migrate-anthos": ["migrate_for_anthos"],
  "managed-ad": ["managed_service_for_microsoft_active_directory"],
  "beyondcorp-enterprise": ["beyondcorp"],
  "cloud-asset-inventory": ["asset_inventory", "cloud_asset_inventory"],
  "policy-intelligence": ["policy_analyzer"],
  "policy-simulator": ["policy_analyzer"],
  "deployment-manager": ["cloud_deployment_manager"],
  "infrastructure-manager": ["cloud_deployment_manager"],
  "cloud-billing": ["billing"],
  "cloud-billing-budget": ["billing"],
  "cloud-quotas": ["quotas"],
  "maps-platform": ["google_maps_platform"],
  "places-api": ["google_maps_platform"],
  "routes-api": ["google_maps_platform"],
  "geocoding-api": ["google_maps_platform"],
  "street-view-api": ["google_maps_platform"],
  "vision-ai": ["cloud_vision_api"],
  "natural-language-ai": ["cloud_natural_language_api"],
  "translation-ai": ["cloud_translation_api"],
  "video-intelligence": ["video_intelligence_api"],
  firewall: ["cloud_firewall_rules"],
  "firebase-test-lab": ["cloud_test_lab"],
  "cloud-testing": ["cloud_test_lab"],
  apigee: ["apigee_api_platform"],
  "apigee-hybrid": ["apigee_api_platform"],
  "apigee-x": ["apigee_api_platform"],
  "data-fusion": ["cloud_data_fusion"],
  "api-gateway": ["cloud_api_gateway"],
  "bare-metal-solution": ["bare_metal_solutions"],
  "contact-center-ai": ["contact_center_ai"],
  "ccai-platform": ["contact_center_ai"],
  "cloud-talent-solution": ["cloud_jobs_api"],
  "cloud-run-jobs": ["cloud_run"],
  "pubsub-lite": ["pubsub"],
  "archive-storage": ["cloud_storage"],
  "cloud-memcached": ["memorystore"],
  "vpc-service-controls": ["access_context_manager"],
  "context-aware-access": ["access_context_manager"],
  "workforce-identity-federation": ["workload_identity_pool"],
  "cloud-identity": ["identity_platform"],
  "cloud-identity-premium": ["identity_platform"],
  "cloud-identity-engine": ["identity_platform"],
  "media-cdn": ["cloud_media_edge"],
  "live-stream-api": ["stream_suite"],
  anthos: ["anthos"],
  "anthos-aws": ["anthos"],
  "anthos-azure": ["anthos"],
  "anthos-vmware": ["anthos"],
  "anthos-service-mesh": ["anthos_service_mesh"],
  "config-connector": ["anthos_config_management"],
  "cloud-data-transfer": ["data_transfer"],
  "bigquery-transfer": ["data_transfer"],
  "endpoints-service-management": ["cloud_endpoints"],
  "endpoints-service-control": ["cloud_endpoints"],
  "cloud-endpoints": ["cloud_endpoints"],
  "edge-tpu": ["cloud_tpu"],
  "cloud-life-sciences": ["genomics"],
  "medical-imaging-suite": ["visual_inspection"],
  "product-discovery": ["retail_api"],
  "retail-api": ["retail_api"],
  "cloud-resource-manager": ["project"],
  "dialogflow-cx": ["dialogflow_cx"],
  "service-directory": ["service_discovery"],
  "network-intelligence-center": ["network_intelligence_center"],
  "network-connectivity-center": ["network_connectivity_center"],
  "network-endpoint-groups": ["cloud_network", "cloud-network"],
  "recaptcha-enterprise": ["phishing_protection", "web_security_scanner"],
  dataform: ["datalab", "data_studio"],
  "cloud-search": ["catalog"],
  "service-infrastructure": ["cloud_apis", "cloud-apis"],
  "workspace-apis": ["cloud_apis", "cloud-apis"],
  chronicle: ["security"],
  "chronicle-soar": ["security_health_advisor"],
  "active-assist": ["agent_assist"],
  "cloud-foundation-toolkit": ["configuration_management"],
  skaffold: ["configuration_management"],
  "cloud-sdk": ["developer_portal"],
  "transcoder-api": ["media_translation_api"],
};

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/^gcp[._-]/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCatalog(source) {
  const services = [];
  const blocks = source.split("defineService({").slice(1);
  for (const block of blocks) {
    const id = block.match(/\bid:\s*"([^"]+)"/)?.[1];
    const category = block.match(/\bcategory:\s*"([^"]+)"/)?.[1];
    if (!id || !category) continue;
    const aliases =
      block
        .match(/\baliases:\s*\[([^\]]*)\]/)?.[1]
        ?.match(/"([^"]+)"/g)
        ?.map((entry) => entry.slice(1, -1)) ?? [];
    services.push({ id, category, aliases });
  }
  return services;
}

async function collectSvgs(root, results = new Map()) {
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      await collectSvgs(fullPath, results);
      continue;
    }
    if (!entry.name.endsWith(".svg")) continue;
    const key = normalize(entry.name.replace(/\.svg$/i, ""));
    if (!results.has(key)) results.set(key, fullPath);
  }
  return results;
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function isSanitizable(path) {
  try {
    sanitizeGcpSvg(await readFile(path, "utf8"), path);
    return true;
  } catch {
    return false;
  }
}

async function isCategoryFallback(path, categoryIcons) {
  const current = await readFile(path);
  for (const fallback of categoryIcons.values()) {
    const candidate = await readFile(fallback);
    if (current.equals(candidate)) return true;
  }
  return false;
}

function unzip(zipPath, dest) {
  execFileSync("unzip", ["-q", "-o", zipPath, "-d", dest]);
}

async function main() {
  await mkdir(officialDir, { recursive: true });
  const extractRoot = join(tmpdir(), `archlex-gcp-icons-${Date.now()}`);
  await mkdir(extractRoot, { recursive: true });
  const legacyDir = join(extractRoot, "legacy");
  const categoryDir = join(extractRoot, "category");
  await mkdir(legacyDir);
  await mkdir(categoryDir);

  unzip(LEGACY_ZIP, legacyDir);
  unzip(CATEGORY_ZIP, categoryDir);

  const catalog = parseCatalog(await readFile(catalogPath, "utf8"));
  const legacyIcons = await collectSvgs(legacyDir);
  const categoryIcons = await collectSvgs(categoryDir);

  const summary = {
    existing: 0,
    product: 0,
    replaced: 0,
    category: 0,
    missing: [],
  };

  for (const service of catalog) {
    if (service.category === "boundary") continue;
    const dest = join(officialDir, `${service.id}.svg`);
    const existing = await fileExists(dest);

    const candidates = [
      service.id,
      ...service.aliases,
      ...(EXTRA_ALIASES[service.id] ?? []),
    ].map(normalize);

    let source;
    for (const candidate of candidates) {
      source = legacyIcons.get(candidate);
      if (source) break;
    }

    if (source && (await isSanitizable(source))) {
      if (!existing) {
        await copyFile(source, dest);
        summary.product += 1;
        continue;
      }
      if (await isCategoryFallback(dest, categoryIcons)) {
        await copyFile(source, dest);
        summary.replaced += 1;
        continue;
      }
      summary.existing += 1;
      continue;
    }

    if (existing) {
      summary.existing += 1;
      continue;
    }

    const fallbackName = CATEGORY_FALLBACKS[service.category];
    const fallback = fallbackName
      ? [...categoryIcons.values()].find((path) => path.endsWith(fallbackName))
      : undefined;
    if (fallback && (await isSanitizable(fallback))) {
      await copyFile(fallback, dest);
      summary.category += 1;
      continue;
    }

    summary.missing.push(`${service.id} (${service.category})`);
  }

  await rm(extractRoot, { recursive: true, force: true });

  console.log(
    `GCP icon sync: kept ${summary.existing}, copied ${summary.product} product, replaced ${summary.replaced} fallbacks, ${summary.category} category fallbacks`,
  );
  if (summary.missing.length > 0) {
    console.log(
      `Unmatched (${summary.missing.length}): ${summary.missing.join(", ")}`,
    );
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
