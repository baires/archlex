import { createHash } from "node:crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type {
  Element as XMLDOMElement,
  Node as XMLDOMNode,
} from "@xmldom/xmldom";
import type { SanitizedIcon } from "./types.js";

// Security allowlists
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
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feFuncA",
  "feFuncR",
  "feFuncG",
  "feFuncB",
  "title",
  "desc",
  "metadata",
  "style",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "viewBox",
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
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "points",
  "xmlns",
  "version",
  "patternUnits",
  "patternTransform",
  "stdDeviation",
  "in",
  "in2",
  "result",
  "mode",
  "type",
  "values",
  "tableValues",
  "slope",
  "intercept",
  "amplitude",
  "exponent",
]);

const FORBIDDEN_PROTOCOLS = ["javascript:", "data:", "http://", "https://"];
const EVENT_ATTRIBUTES = /^on[a-z]/i;

/**
 * Sanitizes raw SVG content with security validation and style inlining
 */
export function sanitizeSvg(
  provider: string,
  key: string,
  rawSvg: string,
): SanitizedIcon {
  // Check for DOCTYPE
  if (/<!DOCTYPE/i.test(rawSvg)) {
    throw new Error(
      `Forbidden DOCTYPE declaration in SVG for ${provider}/${key}`,
    );
  }

  // Parse XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, "image/svg+xml");

  // Check for parse errors
  const parserErrors = doc.getElementsByTagName("parsererror");
  if (parserErrors.length > 0) {
    throw new Error(
      `Failed to parse SVG for ${provider}/${key}: malformed XML`,
    );
  }

  const svgRoot = doc.documentElement;
  if (!svgRoot) {
    throw new Error(`No root element found in SVG for ${provider}/${key}`);
  }
  if (svgRoot.nodeName !== "svg") {
    throw new Error(`Root element must be <svg> for ${provider}/${key}`);
  }

  // Validate viewBox
  const viewBox = svgRoot.getAttribute("viewBox");
  if (!viewBox || !/^[\d\s.-]+$/.test(viewBox)) {
    throw new Error(`Invalid or missing viewBox in SVG for ${provider}/${key}`);
  }

  // Extract and inline styles for GCP icons
  const styleElements = Array.from(svgRoot.getElementsByTagName("style"));
  const styleMap = new Map<string, Record<string, string>>();

  for (const styleEl of styleElements) {
    const cssText = styleEl.textContent || "";
    // Parse simple CSS rules like .st0{fill:#4285F4;}
    const rules = cssText.match(/\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g);
    if (rules) {
      for (const rule of rules) {
        const match = rule.match(/\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/);
        if (match) {
          const className = match[1];
          const declarations = match[2];
          const styleObj: Record<string, string> = {};
          const props = declarations.split(";").filter((p) => p.trim());
          for (const prop of props) {
            const [name, value] = prop.split(":").map((s) => s.trim());
            if (name && value) {
              styleObj[name] = value;
            }
          }
          styleMap.set(className, styleObj);
        }
      }
    }
  }

  // Recursive sanitization
  function sanitizeNode(node: XMLDOMNode): void {
    if (node.nodeType === 1) {
      // Element node
      const element = node as XMLDOMElement;
      const tagName = element.nodeName.toLowerCase();

      // Check element allowlist
      if (!ALLOWED_ELEMENTS.has(tagName)) {
        throw new Error(
          `Unsupported or active element <${tagName}> in SVG for ${provider}/${key}`,
        );
      }

      // Remove style elements after processing
      if (tagName === "style") {
        element.parentNode?.removeChild(element);
        return;
      }

      // Inline styles for elements with class attributes
      const classAttr = element.getAttribute("class");
      if (classAttr && styleMap.size > 0) {
        const classes = classAttr.split(/\s+/);
        for (const cls of classes) {
          const styles = styleMap.get(cls);
          if (styles) {
            for (const [prop, value] of Object.entries(styles)) {
              element.setAttribute(prop, value);
            }
          }
        }
      }

      // Check attributes
      const attributes = Array.from(element.attributes);
      for (const attr of attributes) {
        const attrName = attr.name.toLowerCase();

        // Check for event handlers
        if (EVENT_ATTRIBUTES.test(attrName)) {
          throw new Error(
            `Forbidden event attribute "${attrName}" in SVG for ${provider}/${key}`,
          );
        }

        // Check attribute allowlist
        if (!ALLOWED_ATTRIBUTES.has(attrName)) {
          element.removeAttribute(attr.name);
          continue;
        }

        // Check for forbidden protocols in attribute values
        const attrValue = attr.value;

        // Allow xmlns (safe namespace declarations)
        if (attrName !== "xmlns") {
          for (const protocol of FORBIDDEN_PROTOCOLS) {
            if (attrValue.toLowerCase().includes(protocol)) {
              // Allow fragment IRI references like #id and url(#id)
              if (
                !(attrValue.startsWith("#") || attrValue.startsWith("url(#"))
              ) {
                throw new Error(
                  `Forbidden protocol in attribute "${attrName}" for ${provider}/${key}`,
                );
              }
            }
          }
        }
      }

      // Sort attributes for canonical serialization
      const sortedAttrs = attributes
        .filter((attr) => ALLOWED_ATTRIBUTES.has(attr.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Reapply in sorted order
      for (const attr of attributes) {
        element.removeAttribute(attr.name);
      }
      for (const attr of sortedAttrs) {
        element.setAttribute(attr.name, attr.value);
      }

      // Recursively sanitize children
      const children = Array.from(element.childNodes);
      for (const child of children) {
        sanitizeNode(child as XMLDOMNode);
      }
    } else if (node.nodeType === 3) {
      // Text node - allowed
    } else if (node.nodeType === 8) {
      // Comment node - remove
      node.parentNode?.removeChild(node);
    } else {
      // Other node types - remove
      node.parentNode?.removeChild(node);
    }
  }

  sanitizeNode(svgRoot);

  // Serialize
  const serializer = new XMLSerializer();
  const svgFragment = serializer.serializeToString(svgRoot);

  // Compute checksum
  const checksum = createHash("sha256").update(svgFragment).digest("hex");

  return {
    key,
    provider,
    checksum,
    viewBox,
    svgFragment,
  };
}
