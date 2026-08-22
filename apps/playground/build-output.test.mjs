import { strict as assert } from "node:assert";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dist = new URL("./dist/", import.meta.url);
const assets = new URL("./dist/assets/", import.meta.url);

const headers = await readFile(new URL("_headers", dist), "utf8").catch(
  () => "",
);
assert.notEqual(headers, "", "playground build must emit a _headers file");
assert.match(headers, /^\/assets\/\*\s*$/m);
assert.match(
  headers,
  /^\s+Cache-Control: public, max-age=31536000, immutable\s*$/m,
);

const index = await readFile(new URL("index.html", dist), "utf8");
assert.match(
  index,
  /<link[^>]+rel="preload"[^>]+href="\/assets\/instrument-sans-latin-wght-normal-[^"]+\.woff2"[^>]+as="font"[^>]+crossorigin/,
);

const assetNames = await readdir(assets);
assert.equal(
  assetNames.some((name) => name.endsWith(".woff")),
  false,
  "playground build must emit WOFF2 fonts only",
);

const elkChunks = assetNames.filter(
  (name) => name.startsWith("elk-") && name.endsWith(".js"),
);
assert.ok(elkChunks.length > 0, "expected browser ELK JavaScript assets");

const elkChunkPaths = elkChunks.map((name) => join(assets.pathname, name));
const elkChunkSources = await Promise.all(
  elkChunkPaths.map((path) => readFile(path, "utf8")),
);
for (const source of elkChunkSources) {
  const workerAssetReferences = source.matchAll(
    /["']\/assets\/(elk-worker[^"']+\.js)["']/g,
  );
  for (const reference of workerAssetReferences) {
    assert.ok(
      assetNames.includes(reference[1]),
      `ELK worker asset ${reference[1]} must be emitted with the playground`,
    );
  }
}
const elkChunkStats = await Promise.all(
  elkChunkPaths.map((path) => stat(path)),
);
const elkRawBytes = elkChunkStats.reduce(
  (total, chunk) => total + chunk.size,
  0,
);
const elkGzipBytes = elkChunkSources.reduce(
  (total, chunk) => total + gzipSync(chunk).byteLength,
  0,
);
assert.ok(
  elkRawBytes < 2_800_000,
  `browser ELK assets must exclude the Node worker (received ${elkRawBytes} raw bytes)`,
);
assert.ok(
  elkGzipBytes < 650_000,
  `browser ELK assets must stay below the gzip budget (received ${elkGzipBytes} bytes)`,
);
