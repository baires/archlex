#!/usr/bin/env node

/**
 * ArchLex Standalone Catalog Validation Runner Script
 *
 * Validates AWS, GCP, and Kubernetes service catalog definitions for:
 * 1. Static metadata rules (IDs, display names, categories, duplicate IDs, duplicate aliases).
 * 2. Relationship containment rules (allowedContainment target existence, self-containment loops).
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
  let AWS_SERVICE_CATALOG;
  let GCP_SERVICE_CATALOG;
  let K8S_SERVICE_CATALOG;
  let validateCatalogManifest;
  let validateCatalogContainment;

  try {
    const awsModule = await import("@archlex/aws");
    AWS_SERVICE_CATALOG = awsModule.AWS_SERVICE_CATALOG;
  } catch {
    const awsModule = await import(
      pathToFileURL(resolve(ROOT, "packages/aws/dist/index.js")).href
    );
    AWS_SERVICE_CATALOG = awsModule.AWS_SERVICE_CATALOG;
  }

  try {
    const gcpModule = await import("@archlex/gcp");
    GCP_SERVICE_CATALOG = gcpModule.GCP_SERVICE_CATALOG;
  } catch {
    const gcpModule = await import(
      pathToFileURL(resolve(ROOT, "packages/gcp/dist/index.js")).href
    );
    GCP_SERVICE_CATALOG = gcpModule.GCP_SERVICE_CATALOG;
  }

  try {
    const k8sModule = await import("@archlex/k8s");
    K8S_SERVICE_CATALOG = k8sModule.K8S_SERVICE_CATALOG;
  } catch {
    const k8sModule = await import(
      pathToFileURL(resolve(ROOT, "packages/k8s/dist/index.js")).href
    );
    K8S_SERVICE_CATALOG = k8sModule.K8S_SERVICE_CATALOG;
  }

  try {
    const diagModule = await import("@archlex/diagnostics");
    validateCatalogManifest = diagModule.validateCatalogManifest;
    validateCatalogContainment = diagModule.validateCatalogContainment;
  } catch {
    const diagModule = await import(
      pathToFileURL(resolve(ROOT, "packages/diagnostics/dist/index.js")).href
    );
    validateCatalogManifest = diagModule.validateCatalogManifest;
    validateCatalogContainment = diagModule.validateCatalogContainment;
  }

  return {
    AWS_SERVICE_CATALOG,
    GCP_SERVICE_CATALOG,
    K8S_SERVICE_CATALOG,
    validateCatalogManifest,
    validateCatalogContainment,
  };
}

function validateProviderCatalog(
  name,
  catalog,
  validateCatalogManifest,
  validateCatalogContainment,
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
    };
  }

  const manifestResult = validateCatalogManifest(catalog);
  const containmentDiagnostics = validateCatalogContainment(catalog);
  const diagnostics = [
    ...manifestResult.diagnostics,
    ...containmentDiagnostics,
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
  };
}

async function main() {
  const {
    AWS_SERVICE_CATALOG,
    GCP_SERVICE_CATALOG,
    K8S_SERVICE_CATALOG,
    validateCatalogManifest,
    validateCatalogContainment,
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
    validateCatalogManifest,
    validateCatalogContainment,
  );
  const gcpReport = validateProviderCatalog(
    "GCP",
    GCP_SERVICE_CATALOG,
    validateCatalogManifest,
    validateCatalogContainment,
  );
  const k8sReport = validateProviderCatalog(
    "K8S",
    K8S_SERVICE_CATALOG,
    validateCatalogManifest,
    validateCatalogContainment,
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
