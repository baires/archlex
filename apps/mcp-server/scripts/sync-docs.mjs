import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, "../../../docs");
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../src/generated/docs-resources.ts",
);

function getTitleAndDesc(content, filename) {
  const lines = content.split("\n");
  let title = path.basename(filename, ".md");
  let description = "ArchLex documentation page";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "").trim();
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("---") &&
      !trimmed.startsWith("import")
    ) {
      description = trimmed.substring(0, 150).replace(/"/g, "'");
      break;
    }
  }

  return { title, description };
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (
        file !== "plans" &&
        file !== "superpowers" &&
        file !== "architecture"
      ) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith(".md")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function buildResources() {
  const files = walkDir(DOCS_DIR);
  const resources = {};

  for (const file of files) {
    const relPath = path.relative(DOCS_DIR, file);
    const pathNoExt = relPath.replace(/\.md$/, "");
    const uri = `archlex://docs/${pathNoExt.replace(/\\/g, "/")}`;

    const content = fs.readFileSync(file, "utf-8");
    const { title, description } = getTitleAndDesc(content, file);

    resources[uri] = {
      uri,
      name: title,
      description,
      mimeType: "text/markdown",
      text: content,
    };
  }

  const generatedCode = `// AUTO-GENERATED FILE BY scripts/sync-docs.mjs - DO NOT EDIT MANUALLY
export interface DocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  text: string;
}

export const DOC_RESOURCES: Record<string, DocResource> = ${JSON.stringify(resources, null, 2)};
`;

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, generatedCode, "utf-8");
  console.log(
    `[sync-docs] Successfully synced ${Object.keys(resources).length} documentation resources into src/generated/docs-resources.ts`,
  );
}

buildResources();
