import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const manifest = JSON.parse(
  await readFile(new URL("./package.json", import.meta.url)),
);

assert.equal(manifest.name, "@archlex/design");
assert.equal(manifest.exports["."], "./index.css");
assert.equal(manifest.exports["./themes.css"], "./themes.css");

const css = await readFile(new URL("./index.css", import.meta.url), "utf8");
assert.match(css, /fonts\.css/);
assert.match(css, /tokens\.css/);
assert.match(css, /themes\.css/);
