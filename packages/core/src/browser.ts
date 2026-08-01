const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";

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
  "style",
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
const TEXT_ELEMENTS = new Set(["desc", "style", "text", "title", "tspan"]);

function safetyFailure(reason: string): never {
  throw new Error(`Safety check failed: ${reason}`);
}

function fragmentReference(value: string): string | undefined {
  return value.match(/^#([^\s#"'()<>]+)$/)?.[1];
}

function fragmentUrlReference(value: string): string | undefined {
  const match = value.match(
    /^url\(\s*(?:(["'])#([^\s#"'()<>]+)\1|#([^\s#"'()<>]+))\s*\)$/i,
  );
  return match?.[2] ?? match?.[3];
}

function parseSvgDocument(svgString: string): Document {
  if (typeof svgString !== "string") {
    safetyFailure("SVG input must be a string.");
  }

  const withoutXmlDeclaration = svgString
    .replace(/^\uFEFF/, "")
    .replace(/^\s*<\?xml\s[^?]*\?>/i, "");
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(withoutXmlDeclaration)) {
    safetyFailure("DOCTYPE and entity declarations are forbidden.");
  }
  if (/<\?/.test(withoutXmlDeclaration)) {
    safetyFailure("Processing instructions are forbidden.");
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(
    withoutXmlDeclaration,
    "image/svg+xml",
  );
  const parserError = Array.from(
    document.getElementsByTagName("parsererror"),
  )[0];
  if (parserError) {
    safetyFailure(
      `SVG XML parsing failed: ${parserError.textContent ?? "unknown error"}`,
    );
  }
  if (document.doctype) {
    safetyFailure("DOCTYPE and entity declarations are forbidden.");
  }
  return document;
}

function validateStyleElement(element: Element): void {
  const compactCss = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (
    !/^g\.archlex-node:focus-visible > rect\.archlex-node-surface \{ stroke: #[0-9a-f]{6}; stroke-width: 2; \}$/i.test(
      compactCss,
    )
  ) {
    safetyFailure("Only the static ArchLex focus rule is allowed in style.");
  }
}

function validateParsedSvgTree(document: Document): SVGSVGElement {
  const root = document.documentElement;
  if (
    !root ||
    root.localName !== "svg" ||
    root.namespaceURI !== SVG_NAMESPACE
  ) {
    safetyFailure("The root must be an SVG element in the SVG namespace.");
  }

  const ids = new Set<string>();
  const references: { attribute: string; target: string }[] = [];
  const elements = [root, ...Array.from(root.getElementsByTagName("*"))];

  for (const element of elements) {
    if (element.namespaceURI !== SVG_NAMESPACE) {
      safetyFailure(
        `Foreign namespace ${element.namespaceURI ?? "(none)"} on ${element.nodeName}.`,
      );
    }
    if (!ALLOWED_ELEMENTS.has(element.localName)) {
      safetyFailure(`Unsupported or active element ${element.nodeName}.`);
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeNamespace = attribute.namespaceURI;
      if (attributeNamespace === XMLNS_NAMESPACE) {
        if (
          attribute.value !== SVG_NAMESPACE &&
          attribute.value !== XLINK_NAMESPACE
        ) {
          safetyFailure(`Foreign namespace declaration ${attribute.value}.`);
        }
        continue;
      }
      if (
        attributeNamespace === XML_NAMESPACE ||
        attribute.name === "xml:base"
      ) {
        safetyFailure(`Forbidden XML attribute ${attribute.name}.`);
      }
      if (
        attributeNamespace &&
        !(
          attributeNamespace === XLINK_NAMESPACE &&
          attribute.localName === "href"
        )
      ) {
        safetyFailure(`Foreign attribute namespace ${attributeNamespace}.`);
      }

      const attributeName =
        attributeNamespace === XLINK_NAMESPACE ? "href" : attribute.localName;
      if (/^on/i.test(attributeName) || attributeName === "style") {
        safetyFailure(`Forbidden active attribute ${attribute.name}.`);
      }
      if (
        !ALLOWED_ATTRIBUTES.has(attributeName) &&
        !/^data-archlex-[a-z0-9-]+$/.test(attributeName)
      ) {
        safetyFailure(`Unsupported attribute ${attribute.name}.`);
      }

      const value = attribute.value;
      if (/\b(?:data|file|https?|javascript):/i.test(value)) {
        safetyFailure(`External IRI in ${attribute.name}.`);
      }
      if (attributeName === "href") {
        const target = fragmentReference(value);
        if (!target) safetyFailure(`Non-fragment IRI in ${attribute.name}.`);
        references.push({ attribute: attributeName, target });
      }
      if (/url\s*\(/i.test(value)) {
        const target = fragmentUrlReference(value);
        if (!IRI_ATTRIBUTES.has(attributeName) || !target) {
          safetyFailure(`Non-fragment IRI in ${attribute.name}.`);
        }
        references.push({ attribute: attributeName, target });
      }
      if (ID_REFERENCE_ATTRIBUTES.has(attributeName)) {
        const targets = value.split(/\s+/).filter(Boolean);
        if (targets.length === 0) {
          safetyFailure(`Empty ID reference in ${attribute.name}.`);
        }
        for (const target of targets) {
          if (!/^[^\s#"'()<>]+$/.test(target)) {
            safetyFailure(`Invalid ID reference in ${attribute.name}.`);
          }
          references.push({ attribute: attributeName, target });
        }
      }
      if (attributeName === "id") {
        if (!value || /[\s#"'()<>]/.test(value)) {
          safetyFailure(`Invalid id ${value}.`);
        }
        if (ids.has(value)) safetyFailure(`Duplicate id ${value}.`);
        ids.add(value);
      }
    }

    for (const child of Array.from(element.childNodes)) {
      if (
        child.nodeType === 3 &&
        child.textContent?.trim() &&
        !TEXT_ELEMENTS.has(element.localName)
      ) {
        safetyFailure(`Unexpected text inside ${element.localName}.`);
      }
      if (
        child.nodeType !== 1 &&
        child.nodeType !== 3 &&
        child.nodeType !== 8
      ) {
        safetyFailure(`Unsupported XML node inside ${element.localName}.`);
      }
    }

    if (element.localName === "style") validateStyleElement(element);
  }

  for (const { attribute, target } of references) {
    if (!ids.has(target)) {
      safetyFailure(`Unresolved fragment #${target} in ${attribute}.`);
    }
  }

  return root as unknown as SVGSVGElement;
}

export function validateSvgSafety(svgString: string): void {
  validateParsedSvgTree(parseSvgDocument(svgString));
}

export function mountSvg(container: Element, svgString: string): SVGSVGElement {
  if (!container || typeof container.appendChild !== "function") {
    throw new Error("Invalid container element provided to mountSvg");
  }

  // Parse and walk the exact tree that will be imported. This mount-time layer is
  // intentionally independent from the build-time provider icon sanitizer.
  const parsedSvg = validateParsedSvgTree(parseSvgDocument(svgString));
  const importedNode = document.importNode(
    parsedSvg,
    true,
  ) as unknown as SVGSVGElement;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(importedNode);
  return importedNode;
}
