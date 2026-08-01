#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from built dist
const diagnosticsPath = join(
  __dirname,
  "../packages/diagnostics/dist/index.js",
);
const { getAllDiagnostics } = await import(diagnosticsPath);

async function generateErrorDocs() {
  const docsDir = join(process.cwd(), "docs", "errors");

  // Create directory
  await mkdir(docsDir, { recursive: true });

  const allDiagnostics = getAllDiagnostics();

  // Group by category
  const byCategory = new Map<
    string,
    Array<
      [
        string,
        ReturnType<typeof getAllDiagnostics> extends ReadonlyMap<
          string,
          infer V
        >
          ? V
          : never,
      ]
    >
  >();
  for (const [code, def] of allDiagnostics.entries()) {
    if (!byCategory.has(def.category)) {
      byCategory.set(def.category, []);
    }
    byCategory.get(def.category)?.push([code, def]);
  }

  // Generate index page
  let indexContent = "# CloudMer Error Codes\n\n";
  indexContent += "Complete reference of all diagnostic codes.\n\n";

  for (const [category, items] of byCategory.entries()) {
    indexContent += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    for (const [code, def] of items) {
      const badge =
        def.severity === "error"
          ? "🔴"
          : def.severity === "warning"
            ? "🟡"
            : "🔵";
      indexContent += `- ${badge} [${code}](${code}.md) - ${def.message}\n`;
    }

    indexContent += "\n";
  }

  await writeFile(join(docsDir, "index.md"), indexContent);
  console.log("✓ Generated docs/errors/index.md");

  // Generate individual pages
  for (const [code, def] of allDiagnostics.entries()) {
    let content = `# ${code}\n\n`;
    content += `**Severity:** ${def.severity}  \n`;
    content += `**Category:** ${def.category}\n\n`;

    content += "## Description\n\n";
    content += `${def.message}\n\n`;

    content += "## Remediation\n\n";
    content += `${def.remediation}\n\n`;

    if (def.examples) {
      content += "## Examples\n\n";
      content += "### Invalid\n\n";
      content += `\`\`\`cloudmer\n${def.examples.invalid}\n\`\`\`\n\n`;
      content += "### Valid\n\n";
      content += `\`\`\`cloudmer\n${def.examples.valid}\n\`\`\`\n\n`;
    }

    if (def.relatedCodes && def.relatedCodes.length > 0) {
      content += "## Related Codes\n\n";
      for (const related of def.relatedCodes) {
        content += `- [${related}](${related}.md)\n`;
      }
      content += "\n";
    }

    content += "---\n\n";
    content += "[← Back to Error Codes](index.md)\n";

    await writeFile(join(docsDir, `${code}.md`), content);
    console.log(`✓ Generated docs/errors/${code}.md`);
  }

  console.log(`\n✓ Generated ${allDiagnostics.size} error documentation pages`);
}

generateErrorDocs().catch((error) => {
  console.error("Failed to generate error docs:", error);
  process.exit(1);
});
