#!/usr/bin/env node

/**
 * ArchLex Standalone Catalog Validation Runner Script
 *
 * Validates AWS, GCP, Kubernetes, and Cloudflare service catalog definitions for:
 * 1. Static metadata rules (IDs, display names, categories, duplicate IDs, duplicate aliases).
 * 2. Relationship containment rules (allowedContainment target existence, self-containment loops).
 * 3. Provider relationship rules (unique kinds and valid source/target service IDs).
 * 4. Cloudflare aliases, supported scopes, and artwork mappings.
 * 5. Approved coverage inventory completeness. Included entries missing a resource
 *    or icon fail clearly. A proposed inventory is not yet the completeness authority.
 *
 * Usage:
 *   node scripts/validate-catalog.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const SCOPE_KINDS = new Set([
  "account",
  "region",
  "vpc",
  "subnet",
  "cluster",
  "namespace",
]);
const INVENTORY_PATH = resolve(ROOT, "docs/specs/cloudflare-coverage.json");

function catalogDiagnostic(code, message, remediation, check) {
  return {
    severity: "error",
    code,
    message,
    remediation,
    check,
  };
}

function includedEntries(inventory) {
  return (inventory?.entries ?? []).filter(
    (entry) => entry.status === "included",
  );
}

function includedById(inventory) {
  return new Map(
    includedEntries(inventory)
      .filter((entry) => entry.resourceId)
      .map((entry) => [entry.resourceId, entry]),
  );
}

export function inventoryEnforcesCompleteness(inventory) {
  return inventory?.status === "approved";
}

export function validateCloudflareRegistration({
  services,
  supportedScopes = [],
  resolveService,
  inventory,
  artworkPins,
}) {
  const diagnostics = [];
  const scopes = supportedScopes ?? [];

  if (!scopes.includes("account")) {
    diagnostics.push(
      catalogDiagnostic(
        "CATALOG001",
        "Cloudflare provider is missing supported scope 'account'.",
        "Declare supportedScopes including 'account'.",
        "scope",
      ),
    );
  }

  for (const scope of scopes) {
    if (!SCOPE_KINDS.has(scope)) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG001",
          `Cloudflare supported scope '${scope}' is not a known scope kind.`,
          "Use account, region, vpc, subnet, cluster, or namespace.",
          "scope",
        ),
      );
    }
  }

  const inventoryEntries = inventory ? includedById(inventory) : undefined;

  for (const service of services) {
    const qualified = `cloudflare.${service.id}`;
    if (!service.aliases?.includes(qualified)) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG001",
          `Resource '${service.id}' is missing qualified alias '${qualified}'.`,
          `Add '${qualified}' to the resource aliases.`,
          "alias",
        ),
      );
    }

    for (const alias of service.aliases ?? []) {
      if (!resolveService) continue;
      const resolved = resolveService(alias);
      if (resolved?.id !== service.id) {
        diagnostics.push(
          catalogDiagnostic(
            "CATALOG001",
            `Alias '${alias}' does not resolve to resource '${service.id}'.`,
            "Register the alias on the canonical resource.",
            "alias",
          ),
        );
      }
    }

    if (!service.iconKey) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG003",
          `Resource '${service.id}' is missing artwork mapping.`,
          `Set iconKey to '${qualified}'.`,
          "artwork",
        ),
      );
    }

    for (const container of service.allowedContainment ?? []) {
      if (!scopes.includes(container)) {
        diagnostics.push(
          catalogDiagnostic(
            "CATALOG002",
            `Resource '${service.id}' containment scope '${container}' is not a supported Cloudflare scope.`,
            "Limit allowedContainment to supportedScopes.",
            "scope",
          ),
        );
      }
    }

    if (!inventoryEntries) continue;

    const entry = inventoryEntries.get(service.id);
    if (!entry) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG004",
          `Catalog resource '${service.id}' is not an included inventory entry.`,
          "Add the resource to the coverage inventory or remove it from the catalog.",
          "inventory",
        ),
      );
      continue;
    }

    if (entry.iconKey && service.iconKey !== entry.iconKey) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG003",
          `Resource '${service.id}' artwork mapping '${service.iconKey ?? ""}' does not match inventory icon '${entry.iconKey}'.`,
          `Set iconKey to '${entry.iconKey}'.`,
          "artwork",
        ),
      );
    }

    for (const alias of entry.aliases ?? []) {
      if (!service.aliases?.includes(alias)) {
        diagnostics.push(
          catalogDiagnostic(
            "CATALOG001",
            `Resource '${service.id}' is missing inventory alias '${alias}'.`,
            "Copy the approved alias onto the catalog resource.",
            "alias",
          ),
        );
      }
    }

    const expectedScopes = entry.allowedContainment ?? [];
    const actualScopes = service.allowedContainment ?? [];
    if (expectedScopes.join(",") !== [...actualScopes].join(",")) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG002",
          `Resource '${service.id}' containment scopes do not match the inventory.`,
          `Set allowedContainment to ${expectedScopes.join(", ") || "none"}.`,
          "scope",
        ),
      );
    }

    if (entry.sha256) {
      const pin = artworkPins?.get(service.id);
      const sourceMatches =
        !entry.sourcePath || pin?.sourcePath === entry.sourcePath;
      if (!pin || pin.sha256 !== entry.sha256 || !sourceMatches) {
        diagnostics.push(
          catalogDiagnostic(
            "CATALOG003",
            `Resource '${service.id}' artwork mapping does not match inventory checksum '${entry.sha256}'.`,
            "Pin the approved source path and checksum before shipping the resource.",
            "artwork",
          ),
        );
      }
    }
  }

  return diagnostics;
}

export function validateIncludedInventory({
  inventory,
  services,
  icons,
  supportedScopes,
}) {
  const diagnostics = [];
  const byId = new Map(services.map((service) => [service.id, service]));

  for (const entry of includedEntries(inventory)) {
    const service = byId.get(entry.resourceId);
    if (!service) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG004",
          `Included inventory entry '${entry.resourceId}' is missing a catalog resource.`,
          `Add catalog resource '${entry.resourceId}' before treating the inventory as complete.`,
          "inventory",
        ),
      );
      continue;
    }

    const iconKey = entry.iconKey;
    const iconMapped =
      Boolean(iconKey) &&
      service.iconKey === iconKey &&
      (icons ? icons.has(iconKey) : true);
    if (!iconMapped) {
      diagnostics.push(
        catalogDiagnostic(
          "CATALOG003",
          `Included inventory entry '${entry.resourceId}' is missing icon '${iconKey ?? ""}'.`,
          `Map '${iconKey ?? "the inventory icon"}' for '${entry.resourceId}'.`,
          "artwork",
        ),
      );
    }

    if (!supportedScopes) continue;
    for (const scope of entry.allowedContainment ?? []) {
      if (!supportedScopes.includes(scope)) {
        diagnostics.push(
          catalogDiagnostic(
            "CATALOG002",
            `Included inventory entry '${entry.resourceId}' scope '${scope}' is not supported.`,
            "Limit inventory containment to Cloudflare supportedScopes.",
            "scope",
          ),
        );
      }
    }
  }

  return diagnostics;
}

export function loadCoverageInventory(path = INVENTORY_PATH) {
  const inventoryPath = process.env.ARCHLEX_CLOUDFLARE_INVENTORY
    ? resolve(process.env.ARCHLEX_CLOUDFLARE_INVENTORY)
    : path;
  if (!existsSync(inventoryPath)) return null;
  return JSON.parse(readFileSync(inventoryPath, "utf8"));
}

async function loadModules() {
  const [
    coreModule,
    awsModule,
    gcpModule,
    k8sModule,
    cloudflareModule,
    diagModule,
  ] = await Promise.all(
    ["core", "aws", "gcp", "k8s", "cloudflare", "diagnostics"].map(
      (packageName) =>
        import(
          pathToFileURL(resolve(ROOT, `packages/${packageName}/dist/index.js`))
            .href
        ),
    ),
  );

  return {
    AWS_SERVICE_CATALOG: awsModule.AWS_SERVICE_CATALOG,
    awsProvider: awsModule.awsProvider,
    GCP_SERVICE_CATALOG: gcpModule.GCP_SERVICE_CATALOG,
    gcpProvider: gcpModule.gcpProvider,
    K8S_SERVICE_CATALOG: k8sModule.K8S_SERVICE_CATALOG,
    k8sProvider: k8sModule.k8sProvider,
    cloudflareProvider: cloudflareModule.cloudflareProvider,
    WORKERS_ARTWORK_PIN: cloudflareModule.WORKERS_ARTWORK_PIN,
    validateCatalogManifest: diagModule.validateCatalogManifest,
    validateCatalogContainment: diagModule.validateCatalogContainment,
    validateRelationshipDefinitions: diagModule.validateRelationshipDefinitions,
    KNOWN_RELATIONSHIPS: coreModule.KNOWN_RELATIONSHIPS,
  };
}

function validateProviderCatalog(
  name,
  catalog,
  provider,
  validateCatalogManifest,
  validateCatalogContainment,
  validateRelationshipDefinitions,
  knownRelationships,
) {
  if (!catalog) {
    const missingDiag = {
      severity: "error",
      code: "CATALOG_MISSING",
      message: `${name} provider service catalog is undefined or missing.`,
    };
    return {
      name,
      count: 0,
      valid: false,
      diagnostics: [missingDiag],
      errors: [missingDiag],
      warnings: [],
      manifestCount: 1,
      containmentCount: 0,
      relationshipCount: 0,
    };
  }

  const manifestResult = validateCatalogManifest(catalog);
  const containmentDiagnostics = validateCatalogContainment(catalog);
  const relationshipDiagnostics = validateRelationshipDefinitions(
    catalog,
    provider().listRelationships?.() ?? [],
    { knownKinds: knownRelationships },
  );
  const diagnostics = [
    ...manifestResult.diagnostics,
    ...containmentDiagnostics,
    ...relationshipDiagnostics,
  ];
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  return {
    name,
    count: catalog.size,
    valid: errors.length === 0,
    diagnostics,
    errors,
    warnings,
    manifestCount: manifestResult.diagnostics.length,
    containmentCount: containmentDiagnostics.length,
    relationshipCount: relationshipDiagnostics.length,
  };
}

function countCheck(diagnostics, check) {
  return diagnostics.filter((diagnostic) => diagnostic.check === check).length;
}

function printCheck(label, count) {
  console.log(`  ${label}: ${count === 0 ? "PASS" : `FAIL (${count} issues)`}`);
}

function artworkPinsFromModule(workersPin) {
  const pins = new Map();
  if (workersPin) pins.set("workers", workersPin);
  return pins;
}

function iconMappings(services, artworkPins) {
  const icons = new Set();
  for (const service of services) {
    if (service.iconKey && artworkPins.has(service.id)) {
      icons.add(service.iconKey);
    }
  }
  return icons;
}

async function main() {
  const {
    AWS_SERVICE_CATALOG,
    awsProvider,
    GCP_SERVICE_CATALOG,
    gcpProvider,
    K8S_SERVICE_CATALOG,
    k8sProvider,
    cloudflareProvider,
    WORKERS_ARTWORK_PIN,
    validateCatalogManifest,
    validateCatalogContainment,
    validateRelationshipDefinitions,
    KNOWN_RELATIONSHIPS,
  } = await loadModules();

  console.log(
    "================================================================================",
  );
  console.log("                        Catalog Validation Report");
  console.log(
    "================================================================================",
  );
  console.log("");

  const awsReport = validateProviderCatalog(
    "AWS",
    AWS_SERVICE_CATALOG,
    awsProvider,
    validateCatalogManifest,
    validateCatalogContainment,
    validateRelationshipDefinitions,
    KNOWN_RELATIONSHIPS,
  );
  const gcpReport = validateProviderCatalog(
    "GCP",
    GCP_SERVICE_CATALOG,
    gcpProvider,
    validateCatalogManifest,
    validateCatalogContainment,
    validateRelationshipDefinitions,
    KNOWN_RELATIONSHIPS,
  );
  const k8sReport = validateProviderCatalog(
    "K8S",
    K8S_SERVICE_CATALOG,
    k8sProvider,
    validateCatalogManifest,
    validateCatalogContainment,
    validateRelationshipDefinitions,
    KNOWN_RELATIONSHIPS,
  );
  const provider = cloudflareProvider();
  const services = provider.listServices?.() ?? [];
  const cloudflareCatalog = new Map(
    services.map((service) => [service.id, service]),
  );
  const cloudflareReport = validateProviderCatalog(
    "Cloudflare",
    cloudflareCatalog,
    cloudflareProvider,
    validateCatalogManifest,
    validateCatalogContainment,
    validateRelationshipDefinitions,
    KNOWN_RELATIONSHIPS,
  );
  const inventory = loadCoverageInventory();
  const artworkPins = artworkPinsFromModule(WORKERS_ARTWORK_PIN);
  const registrationDiagnostics = validateCloudflareRegistration({
    services,
    supportedScopes: provider.supportedScopes ?? [],
    resolveService: (kind) => provider.resolveService(kind),
    inventory,
    artworkPins,
  });
  const completenessDiagnostics = inventoryEnforcesCompleteness(inventory)
    ? validateIncludedInventory({
        inventory,
        services,
        icons: iconMappings(services, artworkPins),
        supportedScopes: provider.supportedScopes ?? [],
      })
    : [];
  const cloudflareDiagnostics = [
    ...cloudflareReport.diagnostics,
    ...registrationDiagnostics,
    ...completenessDiagnostics,
  ];
  const cloudflareErrors = cloudflareDiagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );

  const totalServices =
    awsReport.count +
    gcpReport.count +
    k8sReport.count +
    cloudflareReport.count;
  const totalErrors =
    awsReport.errors.length +
    gcpReport.errors.length +
    k8sReport.errors.length +
    cloudflareErrors.length;
  const totalWarnings =
    awsReport.warnings.length +
    gcpReport.warnings.length +
    k8sReport.warnings.length +
    cloudflareDiagnostics.filter(
      (diagnostic) => diagnostic.severity === "warning",
    ).length;

  console.log("Summary:");
  console.log(`  AWS Catalog: ${awsReport.count} services`);
  console.log(`  GCP Catalog: ${gcpReport.count} services`);
  console.log(`  K8S Catalog: ${k8sReport.count} services`);
  console.log(`  Cloudflare Catalog: ${cloudflareReport.count} services`);
  console.log(`  Total Services: ${totalServices} services`);
  console.log("");

  for (const report of [awsReport, gcpReport, k8sReport]) {
    console.log(`--- ${report.name} Provider ---`);
    printCheck("Static Manifest Validation", report.manifestCount);
    printCheck("Containment Validation", report.containmentCount);
    printCheck("Relationship Validation", report.relationshipCount);

    if (report.diagnostics.length > 0) {
      console.log(`  Diagnostics (${report.diagnostics.length}):`);
      for (const diag of report.diagnostics) {
        const icon = diag.severity === "error" ? "✖" : "⚠";
        console.log(
          `    ${icon} [${diag.code}] (${diag.severity}): ${diag.message}`,
        );
        if (diag.remediation) {
          console.log(`      Remediation: ${diag.remediation}`);
        }
      }
    } else {
      console.log("  Status: CLEAN (0 issues found)");
    }
    console.log("");
  }

  console.log("--- Cloudflare Provider ---");
  printCheck("Static Manifest Validation", cloudflareReport.manifestCount);
  printCheck("Containment Validation", cloudflareReport.containmentCount);
  printCheck("Relationship Validation", cloudflareReport.relationshipCount);
  printCheck("Alias Validation", countCheck(cloudflareDiagnostics, "alias"));
  printCheck("Scope Validation", countCheck(cloudflareDiagnostics, "scope"));
  printCheck(
    "Artwork Mapping Validation",
    countCheck(cloudflareDiagnostics, "artwork"),
  );
  if (!inventory) {
    console.log("  Inventory completeness: not registered");
  } else if (!inventoryEnforcesCompleteness(inventory)) {
    console.log(
      `  Inventory completeness: deferred (${inventory.status}, ${includedEntries(inventory).length} included)`,
    );
  } else {
    printCheck(
      "Inventory completeness",
      countCheck(cloudflareDiagnostics, "inventory"),
    );
  }

  if (cloudflareDiagnostics.length > 0) {
    console.log(`  Diagnostics (${cloudflareDiagnostics.length}):`);
    for (const diag of cloudflareDiagnostics) {
      const icon = diag.severity === "error" ? "✖" : "⚠";
      console.log(
        `    ${icon} [${diag.code}] (${diag.severity}): ${diag.message}`,
      );
      if (diag.remediation) {
        console.log(`      Remediation: ${diag.remediation}`);
      }
    }
  } else {
    console.log("  Status: CLEAN (0 issues found)");
  }
  console.log("");

  console.log(
    "================================================================================",
  );
  if (totalErrors > 0) {
    console.log(
      `RESULT: FAILED (${totalErrors} error(s), ${totalWarnings} warning(s))`,
    );
    console.log(
      "================================================================================",
    );
    process.exit(1);
  } else {
    console.log(
      `RESULT: PASSED (${totalServices} services validated, 0 errors)`,
    );
    console.log(
      "================================================================================",
    );
    process.exit(0);
  }
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error("Catalog validation script error:", err);
    process.exit(1);
  });
}
