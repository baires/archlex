import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const archive = process.argv[2];
assert(archive, "Pass the packed @archlex/cloudflare .tgz path");
const entries = execFileSync("tar", ["-tzf", path.resolve(archive)], {
  encoding: "utf8",
})
  .trim()
  .split("\n");
for (const entry of entries) {
  assert(
    !entry.split("/").includes("..") && entry.startsWith("package/"),
    `Unsafe archive path: ${entry}`,
  );
  assert(
    !/\.test\.|tsbuildinfo|\.env|\.dev\.vars|node_modules|assets\/|scripts\//.test(
      entry,
    ),
    `Unexpected packed file: ${entry}`,
  );
}
for (const file of [
  "LICENSE",
  "LICENSE-ARTWORK",
  "NOTICE.md",
  "README.md",
  "package.json",
  "dist/index.js",
  "dist/index.d.ts",
]) {
  assert(entries.includes(`package/${file}`), `Missing ${file}`);
}
const directory = mkdtempSync(path.join(tmpdir(), "archlex-cloudflare-audit-"));
try {
  execFileSync("tar", ["-xzf", path.resolve(archive), "-C", directory]);
  const root = path.join(directory, "package");
  const read = (file) => readFileSync(path.join(root, file), "utf8");
  const metadata = JSON.parse(read("package.json"));
  assert.equal(metadata.license, "MIT AND CC-BY-4.0");
  assert.equal(metadata.exports["."].import, "./dist/index.js");
  assert.equal(metadata.exports["."].types, "./dist/index.d.ts");
  assert(
    Object.values(metadata.dependencies).every(
      (version) => !version.startsWith("workspace:"),
    ),
  );
  assert(read("LICENSE").includes("MIT License"));
  assert(read("LICENSE-ARTWORK").includes("Attribution 4.0 International"));
  for (const text of [
    "Cloudflare, Inc.",
    "48f601bf4293fa9032505f858656d0db5b559131",
    "CC BY 4.0",
    "white backing",
    "not sponsored",
    "trademark rights",
  ])
    assert(read("NOTICE.md").includes(text), `Missing notice: ${text}`);
  const packaged = await import(
    pathToFileURL(path.join(root, metadata.exports["."].import)).href
  );
  assert.equal(packaged.CLOUDFLARE_INCLUDED_IDS.length, 92);
  assert.equal(packaged.cloudflareProvider().listServices().length, 92);
  assert.deepEqual(
    Object.keys(packaged.CLOUDFLARE_ICONS).sort(),
    [...packaged.CLOUDFLARE_INCLUDED_IDS].sort(),
  );
  for (const id of packaged.CLOUDFLARE_INCLUDED_IDS) {
    const icon = packaged.CLOUDFLARE_ICONS[id];
    assert.equal(packaged.resolveCloudflareService(`cloudflare.${id}`).id, id);
    for (const text of [
      "<desc>",
      "CC BY 4.0",
      "https://creativecommons.org/licenses/by/4.0/",
      "48f601bf4293fa9032505f858656d0db5b559131",
      "changes:",
      "No Cloudflare endorsement.",
    ])
      assert(
        icon.svgFragment.includes(text),
        `Missing ${id} attribution: ${text}`,
      );
    assert(!/<script|<foreignObject|\son\w+=/i.test(icon.svgFragment));
  }
  console.log(
    `Package audit passed: ${entries.length} files, 92 attributed icons, resolved exports and separate software/artwork licenses.`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
