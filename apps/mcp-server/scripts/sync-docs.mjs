import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, "../../../docs");
const REPO_DIR = path.resolve(__dirname, "../../..");
const ICON_FILE = path.resolve(
  REPO_DIR,
  "packages/design/assets/apple-touch-icon.png",
);
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../src/generated/docs-resources.ts",
);

function frontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  const fields = {};
  for (const line of match?.[1].split("\n") ?? []) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    fields[key] = value;
  }
  return { fields, body: match ? content.slice(match[0].length) : content };
}

function getTitleAndDesc(content, filename) {
  const parsed = frontmatter(content);
  const lines = parsed.body.split("\n");
  let title = parsed.fields.title || path.basename(filename, ".md");
  let description = parsed.fields.description || "ArchLex documentation page";

  if (!parsed.fields.title) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        title = trimmed.replace(/^#\s+/, "").trim();
        break;
      }
    }
  }

  if (!parsed.fields.description) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("import")
      ) {
        description = trimmed.substring(0, 150).replace(/"/g, "'");
        break;
      }
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

function sourceLastModified(content) {
  const value = frontmatter(content).fields.lastModified;
  const isoDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  return value && isoDateTime.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : undefined;
}

export function lastModifiedForSource(file, content, repoDir = REPO_DIR) {
  const explicit = sourceLastModified(content);
  if (explicit) return explicit;
  const sourcePath = path.relative(repoDir, file);
  try {
    const status = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all", "--", sourcePath],
      {
        cwd: repoDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (status) return undefined;
    return (
      execFileSync("git", ["log", "-1", "--format=%aI", "--", sourcePath], {
        cwd: repoDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
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

    const lastModified = lastModifiedForSource(file, content);
    resources[uri] = {
      uri,
      name: title,
      description,
      mimeType: "text/markdown",
      ...(lastModified ? { lastModified } : {}),
      text: content,
    };
  }

  const iconData = fs.readFileSync(ICON_FILE).toString("base64");
  const generatedCode = `// AUTO-GENERATED FILE BY scripts/sync-docs.mjs - DO NOT EDIT MANUALLY
export const ARCHLEX_PNG_ICON_DATA_URI = "data:image/png;base64,${iconData}";

export interface DocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  lastModified?: string;
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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildResources();
}
