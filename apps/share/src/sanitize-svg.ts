import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
const EMPTY_SVG = `<svg xmlns="${SVG_NAMESPACE}"/>`;

const ALLOWED_ELEMENTS = new Set([
  "circle",
  "clipPath",
  "defs",
  "desc",
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
  "line",
  "linearGradient",
  "marker",
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
  "text",
  "title",
  "tspan",
  "use",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "aria-describedby",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "class",
  "clip-path",
  "clip-rule",
  "clipPathUnits",
  "color-interpolation-filters",
  "cx",
  "cy",
  "d",
  "dominant-baseline",
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
  "focusable",
  "font-family",
  "font-size",
  "font-weight",
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
  "letter-spacing",
  "marker-end",
  "marker-mid",
  "marker-start",
  "markerHeight",
  "markerUnits",
  "markerWidth",
  "mask",
  "maskContentUnits",
  "maskUnits",
  "mode",
  "offset",
  "opacity",
  "operator",
  "orient",
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
  "refX",
  "refY",
  "result",
  "role",
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
  "tabindex",
  "targetX",
  "targetY",
  "text-anchor",
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
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "stroke",
]);
const ID_REFERENCE_ATTRIBUTES = new Set([
  "aria-describedby",
  "aria-labelledby",
]);
const TEXT_ELEMENTS = new Set(["desc", "text", "title", "tspan"]);

function fragmentReference(value: string): string | undefined {
  return value.match(/^#([^\s#"'()<>]+)$/)?.[1];
}

function fragmentUrlReference(value: string): string | undefined {
  const match = value.match(
    /^url\(\s*(?:(['"])#([^\s#"'()<>]+)\1|#([^\s#"'()<>]+))\s*\)$/i,
  );
  return match?.[2] ?? match?.[3];
}

function localName(node: XmlElement): string {
  return node.localName || node.nodeName;
}

function parseDocument(svg: string) {
  const withoutBom = svg.replace(/^\uFEFF/, "");
  const withoutDeclaration = withoutBom.replace(/^\s*<\?xml\s[^?]*\?>/i, "");
  if (
    /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(withoutDeclaration) ||
    /<\?/.test(withoutDeclaration)
  ) {
    return undefined;
  }

  let failed = false;
  try {
    const document = new DOMParser({
      onError: (level: string) => {
        if (level === "error" || level === "fatalError") failed = true;
      },
    }).parseFromString(withoutDeclaration, "image/svg+xml");
    const root = document.documentElement;
    const elementRoots = Array.from(document.childNodes).filter(
      (node) => node.nodeType === 1,
    );
    if (
      failed ||
      !root ||
      elementRoots.length !== 1 ||
      elementRoots[0] !== root ||
      localName(root) !== "svg" ||
      root.namespaceURI !== SVG_NAMESPACE ||
      document.getElementsByTagName("parsererror").length > 0
    ) {
      return undefined;
    }
    return document;
  } catch {
    return undefined;
  }
}

function validateTree(root: XmlElement): void {
  const ids = new Set<string>();
  const references: string[] = [];
  const elements = [root, ...Array.from(root.getElementsByTagName("*"))];

  for (const element of elements) {
    if (
      element.namespaceURI !== SVG_NAMESPACE ||
      !ALLOWED_ELEMENTS.has(localName(element))
    ) {
      throw new Error("Unsupported SVG element or namespace");
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeNamespace = attribute.namespaceURI;
      const attributeName = attribute.localName || attribute.name;

      if (attributeNamespace === XMLNS_NAMESPACE) {
        if (
          attribute.value !== SVG_NAMESPACE &&
          attribute.value !== XLINK_NAMESPACE
        ) {
          throw new Error("Unsupported SVG namespace declaration");
        }
        continue;
      }
      if (
        attributeNamespace === XML_NAMESPACE ||
        attribute.name.toLowerCase() === "xml:base"
      ) {
        throw new Error("Forbidden XML attribute");
      }
      if (
        attributeNamespace &&
        !(attributeNamespace === XLINK_NAMESPACE && attributeName === "href")
      ) {
        throw new Error("Unsupported SVG attribute namespace");
      }

      const normalizedName =
        attributeNamespace === XLINK_NAMESPACE ? "href" : attributeName;
      if (
        /^on/i.test(normalizedName) ||
        normalizedName === "style" ||
        (!ALLOWED_ATTRIBUTES.has(normalizedName) &&
          !/^data-archlex-[a-z0-9-]+$/.test(normalizedName))
      ) {
        throw new Error("Unsupported SVG attribute");
      }

      const value = attribute.value;
      if (/\b(?:data|file|https?|javascript):/i.test(value)) {
        throw new Error("External SVG IRI");
      }
      if (normalizedName === "href") {
        const target = fragmentReference(value);
        if (!target) throw new Error("Non-fragment SVG href");
        references.push(target);
      }
      if (/url\s*\(/i.test(value)) {
        const target = fragmentUrlReference(value);
        if (!IRI_ATTRIBUTES.has(normalizedName) || !target) {
          throw new Error("Non-fragment SVG URL");
        }
        references.push(target);
      }
      if (ID_REFERENCE_ATTRIBUTES.has(normalizedName)) {
        const targets = value.split(/\s+/).filter(Boolean);
        if (targets.length === 0) throw new Error("Empty SVG ID reference");
        for (const target of targets) {
          if (!/^[^\s#"'()<>]+$/.test(target)) {
            throw new Error("Invalid SVG ID reference");
          }
          references.push(target);
        }
      }
      if (normalizedName === "id") {
        if (!value || /[\s#"'()<>]/.test(value) || ids.has(value)) {
          throw new Error("Invalid or duplicate SVG id");
        }
        ids.add(value);
      }
    }

    for (const child of Array.from(element.childNodes)) {
      if (
        child.nodeType === 3 &&
        child.textContent?.trim() &&
        !TEXT_ELEMENTS.has(localName(element))
      ) {
        throw new Error("Unexpected SVG text");
      }
      if (
        child.nodeType !== 1 &&
        child.nodeType !== 3 &&
        child.nodeType !== 8
      ) {
        throw new Error("Unsupported SVG node");
      }
    }
  }

  for (const target of references) {
    if (!ids.has(target)) throw new Error("Unresolved SVG fragment");
  }
}

export function sanitizeDiagramSvg(svg: string): string {
  const document = parseDocument(svg);
  const root = document?.documentElement;
  if (!root) return EMPTY_SVG;

  try {
    validateTree(root);
    return new XMLSerializer().serializeToString(root);
  } catch {
    return EMPTY_SVG;
  }
}
