import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOMParser } from "@xmldom/xmldom";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";

const ALLOWED_ELEMENTS = new Set([
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feDisplacementMap",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "feTile",
  "feTurbulence",
  "filter",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "symbol",
  "title",
  "use",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "class",
  "clip-path",
  "clip-rule",
  "clipPathUnits",
  "color-interpolation-filters",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "edgeMode",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "filterUnits",
  "flood-color",
  "flood-opacity",
  "fr",
  "fx",
  "fy",
  "gradientTransform",
  "gradientUnits",
  "height",
  "href",
  "id",
  "in",
  "in2",
  "k1",
  "k2",
  "k3",
  "k4",
  "mask",
  "maskContentUnits",
  "maskUnits",
  "mode",
  "offset",
  "opacity",
  "operator",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "points",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "r",
  "radius",
  "result",
  "rx",
  "ry",
  "scale",
  "spreadMethod",
  "stdDeviation",
  "stitchTiles",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tableValues",
  "targetX",
  "targetY",
  "transform",
  "type",
  "values",
  "viewBox",
  "width",
  "x",
  "x1",
  "x2",
  "xChannelSelector",
  "y",
  "y1",
  "y2",
  "yChannelSelector",
]);

const IRI_ATTRIBUTES = new Set([
  "clip-path",
  "fill",
  "filter",
  "mask",
  "stroke",
]);
const OMITTED_ROOT_ATTRIBUTES = new Set(["height", "version", "width"]);
const OMITTED_ELEMENTS = new Set(["title"]);
const ATTRIBUTE_ORDER = new Map(
  [
    "id",
    "class",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "width",
    "height",
    "viewBox",
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "d",
  ].map((name, index) => [name, index]),
);
const SVG_NUMBER_SOURCE = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
const VIEWBOX_PATTERN = new RegExp(
  `^\\s*(${SVG_NUMBER_SOURCE})(?:\\s*,\\s*|\\s+)(${SVG_NUMBER_SOURCE})(?:\\s*,\\s*|\\s+)(${SVG_NUMBER_SOURCE})(?:\\s*,\\s*|\\s+)(${SVG_NUMBER_SOURCE})\\s*$`,
);

// Official GCP artwork ships presentational CSS in <style> blocks. Only the
// observed flat subset is supported: comma-separated `.class` selectors and
// presentation properties that survive the sanitizer allowlist below.
const CLASS_SELECTOR_PATTERN = /^\.[A-Za-z0-9_-]+$/;
const CSS_RULE_PATTERN = /([^{}]+)\{([^{}]*)\}/g;
const CSS_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const FORBIDDEN_CSS_VALUE =
  /(?:@|url\s*\(\s*(?!["']?#)|var\s*\(|!important|expression\s*\(|[<>])/i;
const INLINABLE_PROPERTIES = new Set(
  [
    "clip-path",
    "fill",
    "fill-opacity",
    "fill-rule",
    "filter",
    "mask",
    "opacity",
    "stroke",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-opacity",
    "stroke-width",
  ].filter((name) => ALLOWED_ATTRIBUTES.has(name)),
);

function failSvg(sourceName, reason) {
  throw new Error(`${sourceName}: ${reason}`);
}

function validateViewBox(viewBox, sourceName) {
  const match = viewBox.match(VIEWBOX_PATTERN);
  if (!match) {
    failSvg(sourceName, "viewBox must contain exactly four finite numbers");
  }

  const values = match.slice(1).map(Number);
  if (!values.every(Number.isFinite)) {
    failSvg(sourceName, "viewBox must contain exactly four finite numbers");
  }
  if (values[2] <= 0 || values[3] <= 0) {
    failSvg(sourceName, "viewBox width and height must be positive");
  }
}

function escapeXmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlText(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fragmentReference(value) {
  const match = value.match(/^#([^\s#"'()<>]+)$/);
  return match?.[1];
}

function fragmentUrlReference(value) {
  const match = value.match(
    /^url\(\s*(?:(["'])#([^\s#"'()<>]+)\1|#([^\s#"'()<>]+))\s*\)$/i,
  );
  return match?.[2] ?? match?.[3];
}

function parseSvgDocument(svg, sourceName) {
  if (typeof svg !== "string")
    failSvg(sourceName, "SVG input must be a string");

  const withoutDeclaration = svg
    .replace(/^\uFEFF/, "")
    .replace(/^\s*<\?xml\s[^?]*\?>/i, "");
  if (/<!\s*DOCTYPE\b/i.test(withoutDeclaration)) {
    failSvg(sourceName, "forbidden DOCTYPE or entity declaration");
  }
  if (/<!\s*ENTITY\b/i.test(withoutDeclaration)) {
    failSvg(sourceName, "forbidden entity declaration");
  }
  if (/<\?/.test(withoutDeclaration)) {
    failSvg(sourceName, "forbidden processing instruction");
  }

  const parseErrors = [];
  let document;
  try {
    document = new DOMParser({
      onError(level, message) {
        parseErrors.push(`${level}: ${message}`);
      },
    }).parseFromString(withoutDeclaration, "image/svg+xml");
  } catch (error) {
    failSvg(
      sourceName,
      `malformed XML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (parseErrors.length > 0) {
    failSvg(sourceName, `malformed XML: ${parseErrors[0]}`);
  }
  if (document.doctype) {
    failSvg(sourceName, "forbidden DOCTYPE or entity declaration");
  }
  return document;
}

function collectElements(element, localName, results = []) {
  if (element.localName === localName) results.push(element);
  for (let child = element.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) collectElements(child, localName, results);
  }
  return results;
}

function parseClassStyles(styleElements, sourceName) {
  const classStyles = new Map();
  for (const styleElement of styleElements) {
    const namespace = styleElement.namespaceURI ?? null;
    if (namespace !== null && namespace !== SVG_NAMESPACE) {
      failSvg(sourceName, `foreign namespace ${namespace} on style`);
    }
    const cssText = (styleElement.textContent ?? "").replace(
      CSS_COMMENT_PATTERN,
      " ",
    );
    const consumed = cssText.replace(CSS_RULE_PATTERN, "");
    if (consumed.trim()) {
      failSvg(sourceName, `unsupported CSS ${consumed.trim().slice(0, 40)}`);
    }
    CSS_RULE_PATTERN.lastIndex = 0;
    for (const match of cssText.matchAll(CSS_RULE_PATTERN)) {
      const selectors = match[1].split(",").map((s) => s.trim());
      const declarations = new Map();
      for (const declaration of match[2].split(";")) {
        const trimmed = declaration.trim();
        if (!trimmed) continue;
        const separator = trimmed.indexOf(":");
        if (separator === -1) {
          failSvg(sourceName, `unsupported CSS declaration ${trimmed}`);
        }
        const property = trimmed.slice(0, separator).trim().toLowerCase();
        const value = trimmed.slice(separator + 1).trim();
        if (!INLINABLE_PROPERTIES.has(property)) {
          failSvg(sourceName, `unsupported CSS property ${property}`);
        }
        if (FORBIDDEN_CSS_VALUE.test(value)) {
          failSvg(
            sourceName,
            `forbidden CSS value ${value.slice(0, 40)} in ${property}`,
          );
        }
        if (/url\s*\(/i.test(value) && !fragmentUrlReference(value)) {
          failSvg(sourceName, `external non-fragment IRI in CSS ${property}`);
        }
        declarations.set(property, value);
      }
      for (const selector of selectors) {
        if (!CLASS_SELECTOR_PATTERN.test(selector)) {
          failSvg(sourceName, `unsupported CSS selector ${selector}`);
        }
        const className = selector.slice(1);
        const existing = classStyles.get(className) ?? new Map();
        for (const [property, value] of declarations) {
          existing.set(property, value);
        }
        classStyles.set(className, existing);
      }
    }
  }
  return classStyles;
}

// Resolves <style> class rules into plain presentation attributes so the
// output never carries active <style> content, then drops bookkeeping
// attributes (data-*) the sanitizer does not model.
function inlineGcpSvgStyles(document, sourceName) {
  const root = document.documentElement;
  const styleElements = collectElements(root, "style");
  const classStyles = parseClassStyles(styleElements, sourceName);

  const allElements = [root];
  for (let index = 0; index < allElements.length; index += 1) {
    const element = allElements[index];
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) allElements.push(child);
    }
  }

  for (const element of allElements) {
    const dataAttributes = [];
    for (let i = 0; i < element.attributes.length; i += 1) {
      const attribute = element.attributes.item(i);
      if (attribute?.localName.startsWith("data-")) {
        dataAttributes.push(attribute.name);
      }
    }
    for (const name of dataAttributes) element.removeAttribute(name);

    if (element.localName === "style") continue;
    const classAttribute = element.getAttribute("class");
    if (!classAttribute) continue;
    for (const className of classAttribute.trim().split(/\s+/)) {
      const declarations = classStyles.get(className);
      if (!declarations) {
        failSvg(sourceName, `no style rule for class .${className}`);
      }
      for (const [property, value] of declarations) {
        element.setAttribute(property, value);
      }
    }
    element.removeAttribute("class");
  }

  for (const styleElement of styleElements) {
    styleElement.parentNode?.removeChild(styleElement);
  }
  for (const defs of collectElements(root, "defs")) {
    if (!hasElementChildren(defs)) {
      defs.parentNode?.removeChild(defs);
    }
  }
}

function hasElementChildren(element) {
  for (let child = element.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) return true;
  }
  return false;
}

function serializeSafeSvg(document, sourceName) {
  const root = document.documentElement;
  if (!root || root.localName !== "svg") {
    failSvg(sourceName, "root element must be svg");
  }

  const rootNamespace = root.namespaceURI ?? null;
  if (rootNamespace !== null && rootNamespace !== SVG_NAMESPACE) {
    failSvg(sourceName, `foreign root namespace ${rootNamespace}`);
  }

  const ids = new Set();
  const references = [];

  function serializeElement(element, isRoot = false) {
    const namespace = element.namespaceURI ?? null;
    const legacyUnqualifiedElement =
      rootNamespace === null && namespace === null && !element.prefix;
    if (namespace !== SVG_NAMESPACE && !legacyUnqualifiedElement) {
      failSvg(
        sourceName,
        `foreign namespace ${namespace ?? "(none)"} on ${element.nodeName}`,
      );
    }

    const name = element.localName;
    if (!ALLOWED_ELEMENTS.has(name)) {
      failSvg(sourceName, `unsupported or active element ${element.nodeName}`);
    }

    const attributes = [];
    const canonicalAttributeNames = new Set();
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      if (!attribute) continue;

      const attributeNamespace = attribute.namespaceURI ?? null;
      if (attributeNamespace === XMLNS_NAMESPACE) {
        if (
          attribute.value !== SVG_NAMESPACE &&
          attribute.value !== XLINK_NAMESPACE
        ) {
          failSvg(
            sourceName,
            `foreign namespace declaration ${attribute.value}`,
          );
        }
        continue;
      }
      if (
        attributeNamespace === XML_NAMESPACE ||
        attribute.name === "xml:base"
      ) {
        failSvg(sourceName, `forbidden XML attribute ${attribute.name}`);
      }
      if (
        attributeNamespace !== null &&
        !(
          attributeNamespace === XLINK_NAMESPACE &&
          attribute.localName === "href"
        )
      ) {
        failSvg(
          sourceName,
          `foreign attribute namespace ${attribute.namespaceURI}`,
        );
      }

      const attributeName =
        attributeNamespace === XLINK_NAMESPACE ? "href" : attribute.localName;
      if (isRoot && OMITTED_ROOT_ATTRIBUTES.has(attributeName)) continue;
      if (/^on/i.test(attributeName)) {
        failSvg(sourceName, `forbidden event attribute ${attribute.name}`);
      }
      if (attributeName === "style") {
        failSvg(sourceName, `forbidden active attribute ${attribute.name}`);
      }
      if (!ALLOWED_ATTRIBUTES.has(attributeName)) {
        failSvg(sourceName, `unsupported attribute ${attribute.name}`);
      }
      if (canonicalAttributeNames.has(attributeName)) {
        failSvg(sourceName, `duplicate attribute ${attributeName}`);
      }
      canonicalAttributeNames.add(attributeName);

      const value = attribute.value;
      if (/\b(?:data|file|https?|javascript):/i.test(value)) {
        failSvg(sourceName, `forbidden external IRI in ${attribute.name}`);
      }
      if (attributeName === "href") {
        const reference = fragmentReference(value);
        if (!reference) {
          failSvg(sourceName, `external non-fragment IRI in ${attribute.name}`);
        }
        references.push({ attribute: attributeName, target: reference });
      }
      if (/url\s*\(/i.test(value)) {
        const reference = fragmentUrlReference(value);
        if (!IRI_ATTRIBUTES.has(attributeName) || !reference) {
          failSvg(sourceName, `external non-fragment IRI in ${attribute.name}`);
        }
        references.push({ attribute: attributeName, target: reference });
      }
      if (attributeName === "id") {
        if (!value || /[\s#"'()<>]/.test(value)) {
          failSvg(sourceName, `invalid id ${value}`);
        }
        if (ids.has(value)) failSvg(sourceName, `duplicate id ${value}`);
        ids.add(value);
      }

      attributes.push([attributeName, value]);
    }

    attributes.sort(([left], [right]) => {
      const leftOrder = ATTRIBUTE_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = ATTRIBUTE_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    const serializedAttributes = attributes
      .map(
        ([attributeName, value]) =>
          ` ${attributeName}="${escapeXmlAttribute(value)}"`,
      )
      .join("");

    let serializedChildren = "";
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) {
        serializedChildren += serializeElement(child, false);
      } else if (child.nodeType === 3) {
        if (child.data.trim()) serializedChildren += escapeXmlText(child.data);
      } else if (child.nodeType !== 8) {
        failSvg(sourceName, `unsupported XML node inside ${name}`);
      }
    }

    if (OMITTED_ELEMENTS.has(name)) return "";
    if (!serializedChildren) return `<${name}${serializedAttributes}/>`;
    return `<${name}${serializedAttributes}>${serializedChildren}</${name}>`;
  }

  const serialized = serializeElement(root, true);
  for (const { attribute, target } of references) {
    if (!ids.has(target)) {
      failSvg(sourceName, `unresolved fragment IRI #${target} in ${attribute}`);
    }
  }
  return serialized;
}

const generatedIconPath = fileURLToPath(
  new URL("../src/icons/generated.ts", import.meta.url),
);

const officialIconEntries = [
  ["gcp.bigquery", "bigquery.svg"],
  ["gcp.bigtable", "bigtable.svg"],
  ["gcp.cloud-cdn", "cloud-cdn.svg"],
  ["gcp.cloud-dns", "cloud-dns.svg"],
  ["gcp.cloud-functions", "cloud-functions.svg"],
  ["gcp.cloud-load-balancing", "cloud-load-balancing.svg"],
  ["gcp.cloud-run", "cloud-run.svg"],
  ["gcp.cloud-spanner", "cloud-spanner.svg"],
  ["gcp.cloud-sql", "cloud-sql.svg"],
  ["gcp.cloud-storage", "cloud-storage.svg"],
  ["gcp.cloud-tasks", "cloud-tasks.svg"],
  ["gcp.compute-engine", "compute-engine.svg"],
  ["gcp.firestore", "firestore.svg"],
  ["gcp.gke", "gke.svg"],
  ["gcp.iam", "iam.svg"],
  ["gcp.memorystore", "memorystore.svg"],
  ["gcp.pubsub", "pubsub.svg"],
  ["gcp.secret-manager", "secret-manager.svg"],
  ["gcp.subnet", "subnet.svg"],
  ["gcp.vertex-ai", "vertex-ai.svg"],
  ["gcp.vpc", "vpc.svg"],
].map(([key, filename]) => ({
  key,
  sourcePath: fileURLToPath(
    new URL(`../assets/official/${filename}`, import.meta.url),
  ),
}));

export function sanitizeGcpSvg(svg, sourceName) {
  const document = parseSvgDocument(svg, sourceName);
  const root = document.documentElement;
  inlineGcpSvgStyles(document, sourceName);
  const sanitizedSvg = serializeSafeSvg(document, sourceName);
  const viewBox = root?.getAttribute("viewBox");
  if (!viewBox) failSvg(sourceName, "missing viewBox");
  validateViewBox(viewBox, sourceName);
  return { viewBox, svg: sanitizedSvg };
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function generateIconModule(entries) {
  const icons = await Promise.all(
    [...entries]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map(async ({ key, sourcePath }) => {
        try {
          const source = await readFile(sourcePath, "utf8");
          const sanitized = sanitizeGcpSvg(source, sourcePath);

          return {
            key,
            viewBox: sanitized.viewBox,
            checksum: checksum(sanitized.svg),
            svg: sanitized.svg,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(`${key} (${sourcePath}): ${message}`, {
            cause: error,
          });
        }
      }),
  );

  const record = Object.fromEntries(icons.map((icon) => [icon.key, icon]));
  const manifestChecksum = checksum(
    JSON.stringify(
      icons
        .map(({ key, checksum: iconChecksum }) => [key, iconChecksum])
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    ),
  );
  return `// Generated by scripts/import-official-icons.mjs. Do not edit manually.\n\n// biome-ignore format: generated TypeScript literals retain deterministic JSON serialization.\nexport const GCP_GENERATED_ICONS = ${JSON.stringify(record, null, 2)} as const;\n\nexport const GCP_GENERATED_ICON_MANIFEST_CHECKSUM =\n  "${manifestChecksum}" as const;\n`;
}

async function main() {
  const generated = await generateIconModule(officialIconEntries);

  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = await readFile(generatedIconPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (current !== generated) {
      throw new Error(
        "generated GCP icon module is out of date; run pnpm icons:generate",
      );
    }
    return;
  }

  await writeFile(generatedIconPath, generated);
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
