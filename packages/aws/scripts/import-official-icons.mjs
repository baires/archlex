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

function failSvg(sourceName, reason) {
  throw new Error(`${sourceName}: ${reason}`);
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
  {
    key: "aws.ecs",
    sourcePath: fileURLToPath(
      new URL("../assets/official/ecs.svg", import.meta.url),
    ),
  },
  {
    key: "aws.rds",
    sourcePath: fileURLToPath(
      new URL("../assets/official/rds.svg", import.meta.url),
    ),
  },
  {
    key: "aws.rds-proxy",
    sourcePath: fileURLToPath(
      new URL("../assets/official/rds-proxy.svg", import.meta.url),
    ),
  },
];

export function sanitizeAwsSvg(svg, sourceName) {
  const document = parseSvgDocument(svg, sourceName);
  const root = document.documentElement;
  const sanitizedSvg = serializeSafeSvg(document, sourceName);
  const viewBox = root?.getAttribute("viewBox");
  if (!viewBox) failSvg(sourceName, "missing viewBox");
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
        const source = await readFile(sourcePath, "utf8");
        const sanitized = sanitizeAwsSvg(source, sourcePath);

        return {
          key,
          viewBox: sanitized.viewBox,
          checksum: checksum(sanitized.svg),
          svg: sanitized.svg,
        };
      }),
  );

  const record = Object.fromEntries(icons.map((icon) => [icon.key, icon]));
  return `// Generated by scripts/import-official-icons.mjs. Do not edit manually.\n\n// biome-ignore format: generated TypeScript literals retain deterministic JSON serialization.\nexport const AWS_GENERATED_ICONS = ${JSON.stringify(record, null, 2)} as const;\n`;
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
        "generated AWS icon module is out of date; run pnpm icons:generate",
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
