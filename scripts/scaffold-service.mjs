#!/usr/bin/env node

/**
 * ArchLex Service Definition Scaffolder
 *
 * Generates boilerplate service definitions for ArchLex catalogs.
 *
 * Usage:
 *   node scripts/scaffold-service.mjs --provider aws --name "NAT Gateway" --category networking
 *   node scripts/scaffold-service.mjs --provider gcp --name "Cloud NAT" --category networking --containment vpc
 */

import { argv } from "node:process";

// Parse CLI arguments
const args = argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
}

const provider = getArg("provider");
const name = getArg("name");
const category = getArg("category");
const containment = getArg("containment");

// Validation
if (!provider || !["aws", "gcp"].includes(provider)) {
  console.error("Error: --provider must be 'aws' or 'gcp'");
  console.error("\nUsage:");
  console.error(
    '  node scripts/scaffold-service.mjs --provider aws --name "NAT Gateway" --category networking',
  );
  process.exit(1);
}

if (!name) {
  console.error("Error: --name is required");
  console.error("\nUsage:");
  console.error(
    '  node scripts/scaffold-service.mjs --provider aws --name "NAT Gateway" --category networking',
  );
  process.exit(1);
}

if (!category) {
  console.error("Error: --category is required");
  console.error(
    "\nValid categories: networking, compute, database, storage, security, monitoring, analytics, ai-ml, identity, messaging",
  );
  process.exit(1);
}

/**
 * Convert service name to kebab-case ID
 */
function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate common aliases for a service
 */
function generateAliases(id, name, provider) {
  const aliases = [];
  const providerPrefix = provider === "aws" ? "aws" : "gcp";

  // Fully qualified name
  aliases.push(`${providerPrefix}.${id}`);

  // Short versions
  const words = name.split(/\s+/);
  if (words.length > 1) {
    // Acronym (e.g., "NAT Gateway" -> "natgw")
    const acronym = words.map((w) => w[0].toLowerCase()).join("");
    if (acronym !== id && acronym.length >= 2) {
      aliases.push(acronym);
    }

    // First word (e.g., "NAT Gateway" -> "nat")
    const firstWord = words[0].toLowerCase();
    if (firstWord !== id && firstWord.length >= 3) {
      aliases.push(firstWord);
    }
  }

  // Remove duplicates
  return [...new Set(aliases)];
}

/**
 * Generate icon key suggestion
 */
function generateIconKey(id, provider) {
  const providerPrefix = provider === "aws" ? "aws" : "gcp";
  return `${providerPrefix}-${id}`;
}

/**
 * Generate service definition code
 */
function generateServiceDefinition() {
  const id = toKebabCase(name);
  const aliases = generateAliases(id, name, provider);
  const iconKey = generateIconKey(id, provider);

  let definition = "defineService({\n";
  definition += `  id: "${id}",\n`;
  definition += `  displayName: "${name}",\n`;
  definition += `  category: "${category}",\n`;
  definition += `  aliases: [${aliases.map((a) => `"${a}"`).join(", ")}],\n`;

  if (containment) {
    const containmentArray = containment.split(",").map((c) => c.trim());
    definition += `  allowedContainment: [${containmentArray.map((c) => `"${c}"`).join(", ")}],\n`;
  }

  definition += `  iconKey: "${iconKey}"\n`;
  definition += "}),";

  return definition;
}

/**
 * Generate checklist item for tier tracking
 */
function generateChecklistItem() {
  const id = toKebabCase(name);
  const iconKey = generateIconKey(id, provider);

  let item = `- [ ] **${name}** - \`${id}\`\n`;
  item += `  - Category: ${category}\n`;
  item += "  - Aliases: (see generated definition)\n";
  if (containment) {
    item += `  - Containment: ${containment}\n`;
  }
  item += `  - Icon: ${iconKey}\n`;
  item += "  - Status: Not Started\n";

  return item;
}

/**
 * Main execution
 */
function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     ArchLex Service Definition Scaffolder              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`Provider: ${provider.toUpperCase()}`);
  console.log(`Service Name: ${name}`);
  console.log(`Category: ${category}`);
  if (containment) {
    console.log(`Containment: ${containment}`);
  }
  console.log();

  console.log("─".repeat(60));
  console.log("Generated Service Definition:");
  console.log("─".repeat(60));
  console.log();
  console.log(generateServiceDefinition());
  console.log();

  console.log("─".repeat(60));
  console.log(`Add to: packages/${provider}/src/catalog/index.ts`);
  console.log("─".repeat(60));
  console.log();

  console.log("─".repeat(60));
  console.log("Tier Tracking Checklist Item:");
  console.log("─".repeat(60));
  console.log();
  console.log(generateChecklistItem());

  console.log("─".repeat(60));
  console.log("Next Steps:");
  console.log("─".repeat(60));
  console.log();
  console.log(
    `1. Copy the service definition to packages/${provider}/src/catalog/index.ts`,
  );
  console.log(`2. Run icon import: pnpm run import-icons:${provider}`);
  console.log(
    `3. Add to tier tracking: docs/expansion/tier-{N}-${provider}.md`,
  );
  console.log("4. Add catalog tests if needed");
  console.log("5. Add validation rules if needed (optional)");
  console.log(`6. Update catalogVersion in packages/${provider}/src/index.ts`);
  console.log("7. Run: pnpm run check");
  console.log("8. Run: pnpm run test");
  console.log();
}

main();
