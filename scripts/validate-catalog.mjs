#!/usr/bin/env node

/**
 * ArchLex Standalone Catalog Validation Runner Script
 *
 * Validates AWS, GCP, and Kubernetes service catalog definitions for:
 * 1. Static metadata rules (IDs, display names, categories, duplicate IDs, duplicate aliases).
 * 2. Relationship containment rules (allowedContainment target existence, self-containment loops).
 * 3. Provider relationship rules (unique kinds and valid source/target service IDs).
 *
 * Usage:
 *   node scripts/validate-catalog.mjs
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

async function loadModules() {
  const [coreModule, awsModule, gcpModule, k8sModule, diagModule] =
    await Promise.all(
      ["core", "aws", "gcp", "k8s", "diagnostics"].map(
        (packageName) =>
          import(
            pathToFileURL(
              resolve(ROOT, `packages/${packageName}/dist/index.js`),
            ).href
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

async function main() {
  const {
    AWS_SERVICE_CATALOG,
    awsProvider,
    GCP_SERVICE_CATALOG,
    gcpProvider,
    K8S_SERVICE_CATALOG,
    k8sProvider,
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

  const totalServices = awsReport.count + gcpReport.count + k8sReport.count;
  const totalErrors =
    awsReport.errors.length + gcpReport.errors.length + k8sReport.errors.length;
  const totalWarnings =
    awsReport.warnings.length +
    gcpReport.warnings.length +
    k8sReport.warnings.length;

  console.log("Summary:");
  console.log(`  AWS Catalog: ${awsReport.count} services`);
  console.log(`  GCP Catalog: ${gcpReport.count} services`);
  console.log(`  K8S Catalog: ${k8sReport.count} services`);
  console.log(`  Total Services: ${totalServices} services`);
  console.log("");

  for (const report of [awsReport, gcpReport, k8sReport]) {
    console.log(`--- ${report.name} Provider ---`);
    console.log(
      `  Static Manifest Validation: ${
        report.manifestCount === 0
          ? "PASS"
          : `FAIL (${report.manifestCount} issues)`
      }`,
    );
    console.log(
      `  Containment Validation: ${
        report.containmentCount === 0
          ? "PASS"
          : `FAIL (${report.containmentCount} issues)`
      }`,
    );
    console.log(
      `  Relationship Validation: ${
        report.relationshipCount === 0
          ? "PASS"
          : `FAIL (${report.relationshipCount} issues)`
      }`,
    );

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

main().catch((err) => {
  console.error("Catalog validation script error:", err);
  process.exit(1);
});
