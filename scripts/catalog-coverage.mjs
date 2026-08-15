#!/usr/bin/env node

/**
 * ArchLex Catalog Coverage Reporter
 *
 * Compares ArchLex's service catalogs against tier tracking files to report coverage.
 *
 * Usage:
 *   node scripts/catalog-coverage.mjs --provider aws
 *   node scripts/catalog-coverage.mjs --provider gcp
 *   node scripts/catalog-coverage.mjs --provider k8s
 *   node scripts/catalog-coverage.mjs --provider all (default)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// Parse CLI arguments
const args = process.argv.slice(2);
const providerArg = args.find((arg) => arg.startsWith("--provider="));
const provider = providerArg ? providerArg.split("=")[1] : "all";

if (!["aws", "gcp", "k8s", "all"].includes(provider)) {
  console.error(
    `Invalid provider: ${provider}. Must be aws, gcp, k8s, or all.`,
  );
  process.exit(1);
}

/**
 * Load service count from a provider's catalog file
 */
function loadCatalogServiceCount(providerName) {
  try {
    const catalogPath = join(
      ROOT,
      `packages/${providerName}/src/catalog/index.ts`,
    );
    const content = readFileSync(catalogPath, "utf-8");

    // Count defineService calls
    const defineServiceMatches = content.match(/defineService\s*\(/g);
    return defineServiceMatches ? defineServiceMatches.length : 0;
  } catch (err) {
    console.error(`Error reading ${providerName} catalog:`, err.message);
    return 0;
  }
}

/**
 * Load service count from a tier tracking file
 */
function loadTierServiceCount(providerName, tier) {
  if (providerName === "k8s") {
    return tier === 1 ? loadCatalogServiceCount(providerName) : 0;
  }
  try {
    const tierPath = join(
      ROOT,
      `docs/expansion/tier-${tier}-${providerName}.md`,
    );
    const content = readFileSync(tierPath, "utf-8");

    // Extract total services from "Total Services: XX" line
    const match = content.match(/\*\*Total Services\*\*:\s*(\d+)/);
    return match ? Number.parseInt(match[1], 10) : 0;
  } catch (err) {
    console.error(
      `Error reading tier ${tier} for ${providerName}:`,
      err.message,
    );
    return 0;
  }
}

/**
 * Load completed services count from a tier tracking file
 */
function loadTierCompletedCount(providerName, tier) {
  if (providerName === "k8s") {
    return tier === 1 ? loadCatalogServiceCount(providerName) : 0;
  }
  try {
    const tierPath = join(
      ROOT,
      `docs/expansion/tier-${tier}-${providerName}.md`,
    );
    const content = readFileSync(tierPath, "utf-8");

    // Count [x] checkboxes (completed items)
    const completedMatches = content.match(/- \[x\]/g);
    return completedMatches ? completedMatches.length : 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Calculate total target services across all tiers
 */
function calculateTotalTarget(providerName) {
  let total = 0;
  for (let tier = 1; tier <= 4; tier++) {
    total += loadTierServiceCount(providerName, tier);
  }
  return total;
}

/**
 * Report coverage for a single provider
 */
function reportProviderCoverage(providerName) {
  const currentCount = loadCatalogServiceCount(providerName);
  const totalTarget = calculateTotalTarget(providerName);
  const coverage = totalTarget > 0 ? (currentCount / totalTarget) * 100 : 0;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${providerName.toUpperCase()} Service Coverage Report`);
  console.log(`${"=".repeat(60)}\n`);

  console.log(`Current Services: ${currentCount}`);
  console.log(`Target Services: ${totalTarget}`);
  console.log(`Coverage: ${coverage.toFixed(1)}%\n`);

  // Per-tier breakdown
  console.log("Tier Breakdown:");
  console.log("-".repeat(60));

  for (let tier = 1; tier <= 4; tier++) {
    const tierTarget = loadTierServiceCount(providerName, tier);
    const tierCompleted = loadTierCompletedCount(providerName, tier);
    const tierCoverage =
      tierTarget > 0 ? (tierCompleted / tierTarget) * 100 : 0;

    const status =
      tierCompleted === 0
        ? "Not Started"
        : tierCompleted === tierTarget
          ? "Complete"
          : "In Progress";

    console.log(
      `Tier ${tier}: ${tierCompleted}/${tierTarget} services (${tierCoverage.toFixed(
        0,
      )}%) - ${status}`,
    );
  }

  // Progress bar
  console.log("\nProgress:");
  const barLength = 50;
  const filled = Math.round((coverage / 100) * barLength);
  const empty = barLength - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  console.log(`[${bar}] ${coverage.toFixed(1)}%`);

  // Milestones
  console.log("\nMilestones:");
  const milestones = [
    { tier: 1, coverage: 30, label: "Core Infrastructure" },
    { tier: 2, coverage: 50, label: "Application Services" },
    { tier: 3, coverage: 75, label: "Specialized Services" },
    { tier: 4, coverage: 95, label: "Complete Coverage" },
  ];

  for (const milestone of milestones) {
    const reached = coverage >= milestone.coverage;
    const icon = reached ? "✓" : "○";
    const status = reached ? "(Reached)" : "(Pending)";
    console.log(
      `  ${icon} Tier ${milestone.tier}: ${milestone.coverage}% - ${milestone.label} ${status}`,
    );
  }

  return { currentCount, totalTarget, coverage };
}

/**
 * Main execution
 */
function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     ArchLex Service Expansion Coverage Report          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const results = {};

  if (provider === "all" || provider === "aws") {
    results.aws = reportProviderCoverage("aws");
  }

  if (provider === "all" || provider === "gcp") {
    results.gcp = reportProviderCoverage("gcp");
  }

  if (provider === "all" || provider === "k8s") {
    results.k8s = reportProviderCoverage("k8s");
  }

  // Combined summary if reporting both
  if (provider === "all") {
    console.log(`\n${"=".repeat(60)}`);
    console.log("Combined Summary");
    console.log(`${"=".repeat(60)}\n`);

    const totalCurrent =
      results.aws.currentCount +
      results.gcp.currentCount +
      results.k8s.currentCount;
    const totalTarget =
      results.aws.totalTarget +
      results.gcp.totalTarget +
      results.k8s.totalTarget;
    const totalCoverage = (totalCurrent / totalTarget) * 100;

    console.log(`Total Services: ${totalCurrent}/${totalTarget}`);
    console.log(`Overall Coverage: ${totalCoverage.toFixed(1)}%`);

    const barLength = 50;
    const filled = Math.round((totalCoverage / 100) * barLength);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    console.log(`[${bar}] ${totalCoverage.toFixed(1)}%\n`);
  }

  console.log(
    "\nRun this script with --provider=aws, --provider=gcp, or --provider=k8s for provider-specific reports.",
  );
  console.log(
    "Update tier tracking files (docs/expansion/tier-*.md) to track progress.\n",
  );
}

main();
