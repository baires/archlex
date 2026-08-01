import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type {
  Element as XMLDOMElement,
  Node as XMLDOMNode,
} from "@xmldom/xmldom";
import type { SanitizedIcon } from "./types.js";

const DEFAULT_MAX_BYTES = 1_000_000;

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "g",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "pattern",
  "filter",
  "fegaussianblur",
  "feoffset",
  "feblend",
  "fecolormatrix",
  "fecomponenttransfer",
  "fefunca",
  "fefuncr",
  "fefuncg",
  "fefuncb",
  "title",
  "desc",
  "metadata",
  "style",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "viewbox",
  "width",
  "height",
  "x",
  "y",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "id",
  "class",
  "clip-path",
  "mask",
  "filter",
  "x1",
  "y1",
  "x2",
  "y2",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradienttransform",
  "spreadmethod",
  "points",
  "xmlns",
  "version",
  "patternunits",
  "patterntransform",
  "stddeviation",
  "in",
  "in2",
  "result",
  "mode",
  "type",
  "values",
  "tablevalues",
  "slope",
  "intercept",
  "amplitude",
  "exponent",
]);

const EVENT_ATTRIBUTES = /^on[a-z]/i;
const URI_REFERENCE_ATTRIBUTES = new Set([
  "fill",
  "stroke",
  "filter",
  "mask",
  "clip-path",
]);
const PAINT_ATTRIBUTES = new Set(["fill", "stroke"]);
const LOCAL_FRAGMENT_REFERENCE = /^#[a-zA-Z_][a-zA-Z0-9_.:-]*$/;
const LOCAL_FRAGMENT_URL = /^url\(\s*#[a-zA-Z_][a-zA-Z0-9_.:-]*\s*\)$/i;
const SAFE_PAINT_TOKEN =
  /^(?:#[a-f0-9]{3,4}|#[a-f0-9]{6}(?:[a-f0-9]{2})?|[a-z]+)$/i;

export interface SanitizeSvgOptions {
  readonly maxBytes?: number;
}

export async function sanitizeSvg(
  provider: string,
  key: string,
  rawSvg: string,
  options: SanitizeSvgOptions = {},
): Promise<SanitizedIcon> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error("maxBytes must be a finite, non-negative integer");
  }
  const rawBytes = new TextEncoder().encode(rawSvg);
  if (rawBytes.byteLength > maxBytes) {
    throw new Error(
      `SVG for ${provider}/${key} exceeds ${maxBytes} bytes (received ${rawBytes.byteLength})`,
    );
  }

  if (/<!DOCTYPE/i.test(rawSvg)) {
    throw new Error(
      `Forbidden DOCTYPE declaration in SVG for ${provider}/${key}`,
    );
  }
  if (/\bon[a-z]+\s*=/i.test(rawSvg)) {
    throw new Error(`Forbidden event attribute in SVG for ${provider}/${key}`);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(rawSvg, "image/svg+xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error(
      `Failed to parse SVG for ${provider}/${key}: malformed XML`,
    );
  }

  const svgRoot = document.documentElement;
  if (!svgRoot) {
    throw new Error(`No root element found in SVG for ${provider}/${key}`);
  }
  if (svgRoot.nodeName.toLowerCase() !== "svg") {
    throw new Error(`Root element must be <svg> for ${provider}/${key}`);
  }

  const viewBox = svgRoot.getAttribute("viewBox");
  if (!viewBox || !/^[\d\s.-]+$/.test(viewBox)) {
    throw new Error(`Invalid or missing viewBox in SVG for ${provider}/${key}`);
  }

  const styleMap = collectStyleRules(svgRoot);
  sanitizeNode(svgRoot, provider, key, styleMap);

  const svgFragment = new XMLSerializer().serializeToString(svgRoot);
  const bytes = new TextEncoder().encode(svgFragment);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return { key, provider, checksum, viewBox, svgFragment };
}

function collectStyleRules(
  svgRoot: XMLDOMElement,
): Map<string, Record<string, string>> {
  const styleMap = new Map<string, Record<string, string>>();
  for (const styleElement of Array.from(
    svgRoot.getElementsByTagName("style"),
  )) {
    const rules = (styleElement.textContent ?? "").match(
      /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g,
    );
    for (const rule of rules ?? []) {
      const match = rule.match(/\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/);
      if (!match) continue;

      const declarations: Record<string, string> = {};
      for (const property of match[2].split(";")) {
        const [name, value] = property.split(":").map((part) => part.trim());
        if (name && value) declarations[name] = value;
      }
      styleMap.set(match[1], declarations);
    }
  }
  return styleMap;
}

function sanitizeNode(
  node: XMLDOMNode,
  provider: string,
  key: string,
  styleMap: ReadonlyMap<string, Readonly<Record<string, string>>>,
): void {
  if (node.nodeType === 1) {
    const element = node as XMLDOMElement;
    const tagName = element.nodeName.toLowerCase();
    if (!ALLOWED_ELEMENTS.has(tagName)) {
      throw new Error(
        `Unsupported or active element <${tagName}> in SVG for ${provider}/${key}`,
      );
    }
    if (tagName === "style") {
      element.parentNode?.removeChild(element);
      return;
    }

    for (const className of (element.getAttribute("class") ?? "").split(
      /\s+/,
    )) {
      for (const [property, value] of Object.entries(
        styleMap.get(className) ?? {},
      )) {
        element.setAttribute(property, value);
      }
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      if (EVENT_ATTRIBUTES.test(attributeName)) {
        throw new Error(
          `Forbidden event attribute "${attributeName}" in SVG for ${provider}/${key}`,
        );
      }
      if (!ALLOWED_ATTRIBUTES.has(attributeName)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      validateUriReference(attributeName, attribute.value, provider, key);
    }

    const attributes = Array.from(element.attributes).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const attribute of attributes) element.removeAttribute(attribute.name);
    for (const attribute of attributes) {
      element.setAttribute(attribute.name, attribute.value);
    }

    for (const child of Array.from(element.childNodes)) {
      sanitizeNode(child as XMLDOMNode, provider, key, styleMap);
    }
    return;
  }

  if (node.nodeType !== 3) node.parentNode?.removeChild(node);
}

function validateUriReference(
  attributeName: string,
  value: string,
  provider: string,
  key: string,
): void {
  if (!URI_REFERENCE_ATTRIBUTES.has(attributeName)) return;

  const normalizedValue = value.trim();
  const isLocalFragment = LOCAL_FRAGMENT_REFERENCE.test(normalizedValue);
  const isLocalFragmentUrl = LOCAL_FRAGMENT_URL.test(normalizedValue);

  if (normalizedValue.includes("\\")) {
    throwLocalReferenceError(attributeName, provider, key);
  }
  if (isLocalFragment || isLocalFragmentUrl) return;
  if (
    PAINT_ATTRIBUTES.has(attributeName) &&
    SAFE_PAINT_TOKEN.test(normalizedValue)
  ) {
    return;
  }
  if (normalizedValue === "none") return;

  throwLocalReferenceError(attributeName, provider, key);
}

function throwLocalReferenceError(
  attributeName: string,
  provider: string,
  key: string,
): never {
  throw new Error(
    `Only local fragment references are allowed in attribute "${attributeName}" for ${provider}/${key}`,
  );
}
