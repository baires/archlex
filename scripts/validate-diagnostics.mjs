#!/usr/bin/env node

/**
 * CloudMer Diagnostic Code Validator
 *
 * Ensures diagnostic codes are globally unique and follow the naming convention.
 *
 * Usage:
 *   node scripts/validate-diagnostics.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

/**
 * Load diagnostic codes from a provider's registry file
 */
function loadDiagnosticCodes(providerName) {
  try {
    const registryPath = join(
      ROOT,
      `packages/${providerName}/src/registry.ts`
    );
    const content = readFileSync(registryPath, "utf-8");

    // Extract diagnostic codes
    const codes = [];
    const regex = /["']([A-Z]+-[A-Z-]+-\d{3})["']/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      codes.push({
        code: match[1],
        provider: providerName,
        file: registryPath,
      });
    }

    return codes;
  } catch (err) {
    console.error(
      `Error reading ${providerName} registry:`,
      err.message
    );
    return [];
  }
}

/**
 * Validate diagnostic code format
 */
function validateCodeFormat(code) {
  // Expected format: PROVIDER-DOMAIN-RULE-NNN
  // Examples: AWS-NETWORKING-SUBNET-CONTAINMENT-001, GCP-DATA-CLOUD-SQL-NETWORK-001
  const pattern = /^[A-Z]{2,4}-[A-Z-]+-\d{3}$/;

  if (!pattern.test(code)) {
    return {
      valid: false,
      error: `Invalid format: ${code}. Expected: PROVIDER-DOMAIN-RULE-NNN`,
    };
  }

  return { valid: true };
}

/**
 * Check for duplicate codes
 */
function findDuplicates(codes) {
  const seen = new Map();
  const duplicates = [];

  for (const entry of codes) {
    if (seen.has(entry.code)) {
      duplicates.push({
        code: entry.code,
        locations: [seen.get(entry.code), entry],
      });
    } else {
      seen.set(entry.code, entry);
    }
  }

  return duplicates;
}

/**
 * Check provider prefix consistency
 */
function validateProviderPrefix(codes) {
  const errors = [];

  for (const entry of codes) {
    const expectedPrefix = entry.provider.toUpperCase();
    const actualPrefix = entry.code.split("-")[0];

    if (actualPrefix !== expectedPrefix) {
      errors.push({
        code: entry.code,
        provider: entry.provider,
        error: `Code prefix '${actualPrefix}' doesn't match provider '${expectedPrefix}'`,
      });
    }
  }

  return errors;
}

/**
 * Main validation
 */
function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     CloudMer Diagnostic Code Validator                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Load all diagnostic codes
  const awsCodes = loadDiagnosticCodes("aws");
  const gcpCodes = loadDiagnosticCodes("gcp");
  const allCodes = [...awsCodes, ...gcpCodes];

  console.log("Loaded Diagnostic Codes:");
  console.log(`  AWS: ${awsCodes.length} codes`);
  console.log(`  GCP: ${gcpCodes.length} codes`);
  console.log(`  Total: ${allCodes.length} codes\n`);

  let hasErrors = false;

  // Validate format
  console.log("─".repeat(60));
  console.log("Format Validation:");
  console.log("─".repeat(60));

  let formatErrors = 0;
  for (const entry of allCodes) {
    const validation = validateCodeFormat(entry.code);
    if (!validation.valid) {
      console.log(`❌ ${validation.error} (${entry.provider})`);
      formatErrors++;
      hasErrors = true;
    }
  }

  if (formatErrors === 0) {
    console.log("✓ All codes follow the correct format\n");
  } else {
    console.log(`\n❌ ${formatErrors} format error(s) found\n`);
  }

  // Check for duplicates
  console.log("─".repeat(60));
  console.log("Duplicate Detection:");
  console.log("─".repeat(60));

  const duplicates = findDuplicates(allCodes);
  if (duplicates.length === 0) {
    console.log("✓ No duplicate codes found\n");
  } else {
    console.log(`❌ ${duplicates.length} duplicate code(s) found:\n`);
    for (const dup of duplicates) {
      console.log(`  Code: ${dup.code}`);
      console.log(`  Locations:`);
      for (const loc of dup.locations) {
        console.log(`    - ${loc.provider}: ${loc.file}`);
      }
      console.log();
    }
    hasErrors = true;
  }

  // Validate provider prefix
  console.log("─".repeat(60));
  console.log("Provider Prefix Validation:");
  console.log("─".repeat(60));

  const prefixErrors = validateProviderPrefix(allCodes);
  if (prefixErrors.length === 0) {
    console.log("✓ All codes have correct provider prefixes\n");
  } else {
    console.log(`❌ ${prefixErrors.length} prefix error(s) found:\n`);
    for (const error of prefixErrors) {
      console.log(`  ${error.error}`);
      console.log(`    Code: ${error.code} (${error.provider})\n`);
    }
    hasErrors = true;
  }

  // Summary
  console.log("─".repeat(60));
  console.log("Summary:");
  console.log("─".repeat(60));

  if (hasErrors) {
    console.log("❌ Validation failed. Please fix the errors above.\n");
    process.exit(1);
  } else {
    console.log("✓ All diagnostic codes are valid!\n");
    console.log("Code Statistics:");
    console.log(`  Total Codes: ${allCodes.length}`);
    console.log(`  AWS Codes: ${awsCodes.length}`);
    console.log(`  GCP Codes: ${gcpCodes.length}`);
    console.log();
  }
}

main();
